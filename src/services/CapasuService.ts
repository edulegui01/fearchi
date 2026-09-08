import { CAPASU_ENDPOINTS } from '../config/endpoints/capasu';
import type {
  CapasuCartItem,
  CapasuCustomer,
  CapasuProduct,
  CapasuSession,
} from '../types/capasu';

/**
 * Cliente de POSsible PDV para el flujo de compra asistida.
 *
 * No usa HttpClient a proposito: ese cliente apunta al backend del SCO y toma
 * el token de `authToken`. Aca hace falta otra base y otro JWT, y mezclarlos
 * haria que un login pise al otro.
 */
const TOKEN_KEY = 'capasuToken';

export class CapasuService {
  /**
   * Autentica contra POSsible PDV y guarda el token.
   *
   * La terminal es un equipo fijo y desatendido, asi que las credenciales
   * vienen del entorno: no hay nadie para escribirlas al arrancar el dia.
   */
  static async login(): Promise<string> {
    const email = import.meta.env.VITE_CAPASU_EMAIL as string;
    const password = import.meta.env.VITE_CAPASU_PASSWORD as string;

    const response = await fetch(CAPASU_ENDPOINTS.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login de Capasu fallido (${response.status})`);
    }

    const data = (await response.json()) as { token: string };
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.token;
  }

  private static token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Peticion autenticada. Devuelve la respuesta cruda: cada llamada decide que
   * significa cada codigo, porque un 404 no quiere decir lo mismo buscando una
   * compra que buscando un producto.
   *
   * Un 401 es token vencido: se renueva una sola vez y se reintenta. Mas de una
   * seria un lazo, porque si el login nuevo tampoco sirve nada va a cambiar.
   */
  private static async request(
    url: string,
    init: RequestInit = {},
    retryOnAuthError = true,
  ): Promise<Response> {
    let token = this.token();
    if (!token) token = await this.login();

    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });

    if (response.status === 401 && retryOnAuthError) {
      localStorage.removeItem(TOKEN_KEY);
      await this.login();
      return this.request(url, init, false);
    }

    return response;
  }

  /** Igual que `request`, pero para las llamadas que mandan JSON. */
  private static requestJson(url: string, method: string, body: unknown): Promise<Response> {
    return this.request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Compra traspasada a esta terminal, o null si todavia no hay ninguna.
   *
   * El 404 es la respuesta normal mientras nadie escaneo el QR: se traduce a
   * null en vez de propagarse como error, porque la pantalla lo consulta una
   * vez por segundo y no es una falla.
   */
  static async currentSession(terminalCode: string): Promise<CapasuSession | null> {
    const response = await this.request(CAPASU_ENDPOINTS.currentSession(terminalCode));

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`No se pudo consultar la compra (${response.status})`);
    }

    return (await response.json()) as CapasuSession;
  }

  /**
   * Ficha del producto escaneado en la terminal.
   *
   * Devuelve null cuando el codigo no existe: la pantalla tiene que poder
   * decirle al cliente "ese producto no esta" sin tratarlo como una caida del
   * sistema, que es lo que haria propagar el error.
   */
  static async productByBarcode(barcode: string): Promise<CapasuProduct | null> {
    const response = await this.request(CAPASU_ENDPOINTS.productByBarcode(barcode));

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`No se pudo consultar el producto (${response.status})`);
    }

    return (await response.json()) as CapasuProduct;
  }

  /**
   * Guarda el peso unitario que la balanza acaba de medir.
   *
   * Devuelve la ficha actualizada para que la pantalla refresque la linea con
   * el peso que quedo guardado, y no con el que creyo haber mandado.
   */
  static async saveProductWeight(productId: number, weightGrams: number): Promise<CapasuProduct> {
    const response = await this.requestJson(
      CAPASU_ENDPOINTS.productWeight(productId),
      'POST',
      { weight_grams: weightGrams },
    );

    if (!response.ok) {
      throw new Error(`No se pudo guardar el peso (${response.status})`);
    }

    return (await response.json()) as CapasuProduct;
  }

  /**
   * Busca al cliente por documento.
   *
   * Null cuando no esta en el padron: la terminal responde pidiendole la razon
   * social para darlo de alta, asi que no encontrarlo es un paso del flujo y
   * no una falla.
   */
  static async customerByDocument(document: string): Promise<CapasuCustomer | null> {
    const response = await this.request(CAPASU_ENDPOINTS.customerByDocument(document));

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`No se pudo consultar el cliente (${response.status})`);
    }

    return (await response.json()) as CapasuCustomer;
  }

  /** Da de alta al cliente con la razon social que tecleo en la terminal. */
  static async registerCustomer(document: string, name: string): Promise<CapasuCustomer> {
    const response = await this.requestJson(CAPASU_ENDPOINTS.customers, 'POST', {
      document,
      name,
    });

    if (!response.ok) {
      throw new Error(`No se pudo registrar el cliente (${response.status})`);
    }

    return (await response.json()) as CapasuCustomer;
  }

  /**
   * Cierra el carrito que el cliente armo escaneando en la terminal.
   *
   * Lo que queda es una compra igual a la que trae el colector, asi que a
   * partir de aca la cobran `pay` y `release` como cualquier otra.
   */
  static async submitCart(
    terminalCode: string,
    items: CapasuCartItem[],
    expectedWeightGrams?: number,
    customerId?: number | null,
  ): Promise<CapasuSession> {
    const response = await this.requestJson(
      CAPASU_ENDPOINTS.checkoutCart(terminalCode),
      'POST',
      {
        items,
        expected_weight_grams: expectedWeightGrams ?? null,
        customer_id: customerId ?? null,
      },
    );

    if (!response.ok) {
      throw new Error(`No se pudo cerrar el carrito (${response.status})`);
    }

    return (await response.json()) as CapasuSession;
  }

  /**
   * Descarta el carrito sin cerrar de la terminal.
   *
   * Se llama tambien al empezar una compra nueva, para no arrastrar lo que
   * haya quedado de una anterior. Por eso no es un error que no haya nada.
   */
  static async clearCart(terminalCode: string): Promise<void> {
    const response = await this.request(CAPASU_ENDPOINTS.checkoutCart(terminalCode), {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`No se pudo limpiar el carrito (${response.status})`);
    }
  }

  /**
   * Marca la compra como cobrada.
   *
   * Con esto deja de ser la compra actual de la terminal, asi que el proximo
   * poll devuelve null y la pantalla vuelve sola al QR: no hace falta ningun
   * estado extra para limpiarla.
   */
  static pay(uuid: string): Promise<void> {
    return this.close(CAPASU_ENDPOINTS.pay(uuid), 'No se pudo cerrar la compra');
  }

  /**
   * Suelta la compra sin cobrarla.
   *
   * Como el cobro, deja de ser la compra actual de la terminal y la pantalla
   * vuelve sola al QR.
   */
  static release(uuid: string): Promise<void> {
    return this.close(CAPASU_ENDPOINTS.release(uuid), 'No se pudo cancelar la compra');
  }

  /** Las dos salidas de la caja son el mismo POST contra distinta URL. */
  private static async close(url: string, mensajeError: string): Promise<void> {
    const response = await this.request(url, { method: 'POST' });

    if (!response.ok) {
      throw new Error(`${mensajeError} (${response.status})`);
    }
  }
}

export default CapasuService;
