import HttpClient from '../../utils/httpClient';
import { ApiError } from '../../utils/ApiError';
import CapasuService from '../CapasuService';
import { ARCHI_ENDPOINTS } from '../../config/endpoints/archi';
import { CAPASU_BAG_BARCODE, CAPASU_TERMINAL_CODE } from '../../config/endpoints/capasu';

/**
 * Las operaciones que la pantalla de venta necesita de un backend.
 *
 * Existe porque la misma pantalla corre contra dos sistemas distintos —el POS
 * de archi y POSsible PDV— que resuelven lo mismo de formas que no se parecen:
 * uno identifica los productos por codigo interno y mantiene un ticket vivo en
 * el servidor, el otro los identifica por id y recibe el carrito entero al
 * final. Sin esta capa la pantalla tendria un `if` por llamada, y cada arreglo
 * en una rama habria que acordarse de repetirlo en la otra.
 */
export type SaleBackendKind = 'archi' | 'capasu';

/** Producto tal como lo consume la pantalla, ya normalizado. */
export interface SaleProduct {
  /** Id numerico. Solo lo trae capasu; archi identifica por codigo. */
  productId?: number;
  /** Codigo interno, estable entre lecturas de un mismo producto. */
  codigo: string;
  barcode: string;
  descripcion: string;
  descripcionCorta: string;
  precio: number;
  /** Nulo cuando el producto no tiene peso cargado y hay que pesarlo. */
  pesoGramos: number | null;
  /** El codigo de barras lleva el peso adentro (balanza de salon). */
  esPesable: boolean;
  imagen: string;
}

/** Linea del carrito lista para mandar al backend. */
export interface SaleLine {
  productId?: number;
  barcode: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

/** Con que identificar un producto al guardarle el peso. */
export interface SaleWeightRef {
  codigo: string;
  productId?: number;
}

/** Cliente al que se le factura la compra. */
export interface SaleCustomer {
  /** Id en POSsible PDV. Archi no tiene uno: identifica por documento. */
  id?: number;
  document: string;
  nombre: string;
  /** Respuesta cruda del backend, para las pantallas que la arrastran. */
  raw?: unknown;
}

/** Datos de facturacion con los que arranca la compra. */
export interface SaleInvoice {
  razonSocial: string;
  documento: string;
  facturaNro: number;
  customerId?: number | null;
  clientData?: unknown;
}

export type SalePaymentMethod = 'tarjeta' | 'qr';

/** La compra tal como la necesita el cobro. */
export interface SalePaymentOrder {
  totalAmount: number;
  lines: SaleLine[];
}

/**
 * Resultado del cobro, con los datos que la pantalla muestra en el modal.
 *
 * Casi todo es opcional porque lo llena la pasarela: un cobro simulado no
 * tiene numero de autorizacion ni tarjeta, y inventarlos haria que un pago
 * que nunca ocurrio se vea igual que uno real.
 */
export interface SalePaymentResult {
  /**
   * Texto que encabeza el modal. Opcional: sin pasarela no hay nada
   * particular que decir, y la pantalla ya tiene su propio mensaje de exito
   * traducido para ese caso.
   */
  message?: string;
  codigoAutorizacion?: string;
  mensajeDisplay?: string;
  nombreCliente?: string;
  nombreTarjeta?: string;
  nroBoleta?: string;
  pan?: string;
  saldo?: number;
  montoVuelto?: number;
}

export interface SaleSubmitResult {
  /** Compra creada en POSsible PDV. La terminal la necesita para cobrarla. */
  sessionUuid?: string;
}

export interface SaleBackend {
  readonly kind: SaleBackendKind;

  /**
   * El backend lleva la cuenta del ticket a medida que se escanea.
   *
   * Cambia como se comportan los botones de cantidad: contra un ticket vivo
   * hay que avisarle al servidor de cada suma y resta, y contra un carrito
   * local alcanza con cambiar el estado de la pantalla.
   */
  readonly usesLiveTicket: boolean;

  /**
   * La terminal valida la compra contra una balanza.
   *
   * Donde no la hay, toda la maquinaria de peso tiene que quedar apagada y no
   * solo inactiva: un producto sin peso cargado abre el modal de pesaje y
   * bloquea el escaneo esperando una lectura que no va a llegar nunca, y el
   * cliente queda sin forma de seguir ni de salir.
   */
  readonly usesScale: boolean;

  /** Ficha del producto escaneado, o null si el codigo no existe. */
  lookupProduct(barcode: string): Promise<SaleProduct | null>;

  /** Manda el carrito armado. Es lo que corre al confirmar la compra. */
  submitCart(
    lines: SaleLine[],
    expectedWeightGrams?: number,
    customerId?: number | null,
  ): Promise<SaleSubmitResult>;

  /**
   * Deja el backend listo para una compra nueva.
   *
   * Corre al apretar "Iniciar compra", antes de pedir cualquier dato: lo que
   * haya quedado de una compra anterior abandonada tiene que irse ahi, o la
   * primera lectura del proximo cliente se suma a un carrito ajeno.
   */
  beginPurchase(): Promise<void>;

  /** Arranca una compra sin nombre: la opcion "Sin Nombre" de la pantalla. */
  beginAnonymousInvoice(): Promise<SaleInvoice>;

  /** Busca al cliente por documento. Null si no esta en el padron. */
  findCustomer(document: string): Promise<SaleCustomer | null>;

  /** Da de alta al cliente con la razon social que tecleo en la pantalla. */
  registerCustomer(document: string, nombre: string): Promise<SaleCustomer>;

  /** Arranca la compra a nombre de un cliente ya resuelto. */
  beginNamedInvoice(customer: SaleCustomer): Promise<SaleInvoice>;

  /**
   * Cobra la compra y la deja cerrada.
   *
   * Donde hay pasarela esto habla con el equipo y espera al cliente; donde no
   * la hay, se simula y lo unico que pasa de verdad es que la compra queda
   * marcada como pagada.
   */
  processPayment(
    method: SalePaymentMethod,
    order: SalePaymentOrder,
  ): Promise<SalePaymentResult>;

  /**
   * Producto bolsa, listo para sumar al carrito.
   *
   * Null cuando la instalacion no tiene bolsa configurada: la pantalla lo
   * trata igual que un "no quiero bolsa" y sigue de largo.
   */
  addBag(): Promise<SaleProduct | null>;

  /** Descarta lo que haya cargado, para arrancar de cero. */
  clearCart(): Promise<void>;

  /** Guarda el peso unitario recien medido. Devuelve el que quedo guardado. */
  saveProductWeight(ref: SaleWeightRef, weightGrams: number): Promise<number>;

  /**
   * Deja el backend en un estado usable despues de un envio fallido.
   *
   * Solo hace algo donde el envio puede dejar basura a medio cargar; donde el
   * carrito viaja entero o no viaja, no hay nada que reparar.
   */
  recoverFromSubmitError(): Promise<void>;
}

interface ProductoConsultaResponse {
  codigo: string;
  codigo_barra: string;
  descripcion: string;
  descripcion_corta: string;
  precio: number;
  peso_gramos?: string;
  pesable?: number;
  foto?: string;
}

interface ScanningPesoResponse {
  peso_gramos: number;
}

interface VentasAutResponse {
  estado?: number;
  nombre_cliente?: string;
  documento?: string;
  ticket?: number;
}

interface PaymentResponse {
  codigoAutorizacion: string;
  mensajeDisplay: string;
  montoVuelto: number;
  nombreCliente: string;
  nombreTarjeta: string;
  nroBoleta: string;
  saldo: number;
  pan?: string;
}

interface ScanProductResponse {
  codigo?: string;
  codigo_barras: string;
  descripcion: string;
  precio: number;
  peso?: string;
  es_pesable?: boolean;
  imagen?: string;
}

/** Documento con el que archi factura una compra sin nombre. */
const ARCHI_ANONYMOUS_DOCUMENT = '44444401-7';

/** Codigo con el que archi identifica la bolsa. */
const ARCHI_BAG_CODE = '364';

/**
 * Donde queda el uuid de la compra entre la pantalla de venta y la de cobro.
 *
 * Es lo unico que identifica a la compra creada en POSsible PDV, y las dos
 * pantallas estan separadas por una navegacion: sin este puente, la de cobro
 * no tendria contra que cerrar.
 */
export const CAPASU_SESSION_KEY = 'capasuSessionUuid';

/** Lee un campo de la factura en curso, tal como la dejo la pantalla anterior. */
function readInvoiceField<T>(field: string, fallback: T): T {
  const invoiceDataStr = sessionStorage.getItem('invoiceData');
  if (!invoiceDataStr) return fallback;

  try {
    return JSON.parse(invoiceDataStr)[field] || fallback;
  } catch {
    return fallback;
  }
}

const getCaja = () => readInvoiceField<number>('caja', 1);
const getDocumento = () => readInvoiceField<string>('ruc', '44444401-7');

class ArchiSaleBackend implements SaleBackend {
  readonly kind = 'archi' as const;

  readonly usesLiveTicket = true;

  readonly usesScale = true;

  async lookupProduct(barcode: string): Promise<SaleProduct> {
    const response = await HttpClient.get<ProductoConsultaResponse>(
      ARCHI_ENDPOINTS.consultaProducto(barcode),
    );

    // Cadena vacia es "sin peso cargado", no cero: el producto todavia no paso
    // por la balanza, y tratarlo como cero lo daria por pesado.
    const peso = response.peso_gramos ? parseFloat(response.peso_gramos) : NaN;

    return {
      codigo: response.codigo,
      barcode: response.codigo_barra || barcode,
      descripcion: response.descripcion || `Producto ${barcode}`,
      descripcionCorta:
        response.descripcion_corta || response.descripcion || `Producto ${barcode}`,
      precio: response.precio || 0,
      pesoGramos: Number.isNaN(peso) ? null : peso,
      esPesable: response.pesable === 1,
      imagen: response.foto ? `${import.meta.env.VITE_API_BASE_URL}${response.foto}` : '',
    };
  }

  async submitCart(lines: SaleLine[]): Promise<SaleSubmitResult> {
    await HttpClient.post(ARCHI_ENDPOINTS.insertarProductos, {
      caja: getCaja(),
      productos: lines.map((line) => ({
        cod_barra: line.barcode,
        descripcion: line.descripcion,
        cantidad: line.cantidad,
        precio_unitario: line.precioUnitario,
        subtotal: line.precioUnitario * line.cantidad,
      })),
    });

    return {};
  }

  async clearCart(): Promise<void> {
    await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja: getCaja() });
  }

  async saveProductWeight(ref: SaleWeightRef, weightGrams: number): Promise<number> {
    const response = await HttpClient.post<ScanningPesoResponse>(ARCHI_ENDPOINTS.scanningPeso, {
      scanning: ref.codigo,
      peso_gramos: weightGrams,
    });

    return response.peso_gramos;
  }

  /**
   * Caja configurada en el equipo.
   *
   * Se cachea porque no cambia mientras la terminal esta prendida, y las
   * pantallas de facturacion la piden varias veces seguidas.
   *
   * Ojo: no es la misma que `getCaja()`. Aquella lee la caja de la factura en
   * curso y hoy siempre cae en 1, porque ninguna pantalla llega a escribirla
   * en `invoiceData`. Unificarlas arreglaria ese agujero, pero cambiaria a que
   * caja se le limpia el ticket a una terminal ya instalada, asi que queda
   * como esta hasta que alguien lo decida a proposito.
   */
  private cajaConfig: number | null = null;

  private async fetchCaja(): Promise<number> {
    if (this.cajaConfig === null) {
      const response = await HttpClient.get<{ caja: number }>(ARCHI_ENDPOINTS.cajaConfig);
      this.cajaConfig = response.caja;
    }

    return this.cajaConfig;
  }

  /**
   * Vacia el ticket vivo con la caja configurada en el equipo.
   *
   * Usa `fetchCaja()` y no `getCaja()` a proposito: en este punto todavia no
   * hay factura elegida, asi que `invoiceData` esta vacio y la caja solo puede
   * venir del backend.
   */
  async beginPurchase(): Promise<void> {
    const caja = await this.fetchCaja();
    await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja: Number(caja) });
  }

  async beginAnonymousInvoice(): Promise<SaleInvoice> {
    const caja = await this.fetchCaja();

    const cliente = await HttpClient.post<VentasAutResponse>(ARCHI_ENDPOINTS.findClientDetails, {
      caja,
      operacion: 4,
      documento: ARCHI_ANONYMOUS_DOCUMENT,
    });

    const factura = await HttpClient.post<VentasAutResponse>(ARCHI_ENDPOINTS.createInvoice, {
      caja,
      operacion: 6,
      documento: cliente.documento,
    });

    return {
      razonSocial: factura.nombre_cliente ?? 'Sin Nombre',
      documento: factura.documento ?? '0',
      facturaNro: factura.ticket ?? 0,
    };
  }

  async findCustomer(document: string): Promise<SaleCustomer | null> {
    const caja = await this.fetchCaja();

    try {
      const response = await HttpClient.post<VentasAutResponse>(
        ARCHI_ENDPOINTS.findClientDetails,
        { caja, operacion: 4, documento: document },
      );

      // Cualquier estado que no sea 1 significa que el padron no lo reconoce,
      // aunque el request haya salido bien.
      if (response.estado !== 1) return null;

      return {
        document,
        nombre: response.nombre_cliente ?? '',
        raw: response,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async registerCustomer(document: string, nombre: string): Promise<SaleCustomer> {
    const caja = await this.fetchCaja();

    await HttpClient.post(ARCHI_ENDPOINTS.registerClient, {
      caja,
      operacion: 5,
      documento: document,
      nombre,
    });

    return { document, nombre };
  }

  async beginNamedInvoice(customer: SaleCustomer): Promise<SaleInvoice> {
    const caja = await this.fetchCaja();

    const factura = await HttpClient.post<VentasAutResponse>(ARCHI_ENDPOINTS.createInvoice, {
      caja,
      operacion: 6,
      documento: customer.document,
    });

    return {
      razonSocial: customer.nombre || factura.nombre_cliente || '',
      documento: customer.document,
      facturaNro: factura.ticket ?? 0,
      clientData: customer.raw ?? factura,
    };
  }

  /**
   * Habla con el equipo de cobro y espera a que el cliente termine.
   *
   * Sin timeout a proposito: del otro lado hay alguien apoyando una tarjeta o
   * escaneando un QR, y cortar por tiempo dejaria la venta en un limbo donde
   * el banco cobro y la caja cree que no.
   */
  async processPayment(
    method: SalePaymentMethod,
    order: SalePaymentOrder,
  ): Promise<SalePaymentResult> {
    const endpoint =
      method === 'tarjeta' ? ARCHI_ENDPOINTS.pagoTarjeta : ARCHI_ENDPOINTS.pagoQr;

    const originalTimeout = HttpClient.getTimeout();
    HttpClient.setTimeout(0);

    let response: PaymentResponse;
    try {
      response = await HttpClient.post<PaymentResponse>(endpoint, {
        caja: getCaja(),
        facturaNro: readInvoiceField<number>('facturaNro', 0),
        monto: order.totalAmount,
        detalles: order.lines.map((line) => ({
          codigoBarras: line.barcode,
          cantidad: line.cantidad,
          totalPrecio: line.precioUnitario * line.cantidad,
        })),
      });
    } finally {
      HttpClient.setTimeout(originalTimeout);
    }

    return {
      message: response.mensajeDisplay,
      codigoAutorizacion: response.codigoAutorizacion,
      mensajeDisplay: response.mensajeDisplay,
      nombreCliente: response.nombreCliente,
      nombreTarjeta: response.nombreTarjeta,
      nroBoleta: response.nroBoleta,
      pan: response.pan,
      saldo: response.saldo,
      montoVuelto: response.montoVuelto,
    };
  }

  /**
   * La bolsa entra por el mismo escaneo que cualquier producto, asi que este
   * llamado ya la deja sumada al ticket vivo.
   */
  async addBag(): Promise<SaleProduct> {
    const bolsa = await HttpClient.post<ScanProductResponse>(ARCHI_ENDPOINTS.scanProducto, {
      scan: ARCHI_BAG_CODE,
      cantidad_a_insertar: 1,
    });

    const peso = bolsa.peso ? parseFloat(bolsa.peso) : NaN;

    return {
      codigo: bolsa.codigo ?? ARCHI_BAG_CODE,
      barcode: bolsa.codigo_barras,
      descripcion: bolsa.descripcion,
      descripcionCorta: bolsa.descripcion,
      precio: bolsa.precio,
      pesoGramos: Number.isNaN(peso) ? null : peso,
      esPesable: bolsa.es_pesable ?? false,
      imagen: bolsa.imagen ? `${import.meta.env.VITE_API_BASE_URL}${bolsa.imagen}` : '',
    };
  }

  /**
   * Un envio fallido puede haber insertado parte de las lineas, asi que el
   * ticket queda inconsistente: se vacia y se rehace la factura del cliente
   * que ya estaba elegido, para poder reintentar sin volver al menu.
   */
  async recoverFromSubmitError(): Promise<void> {
    const caja = getCaja();
    await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja });
    await HttpClient.post(ARCHI_ENDPOINTS.createInvoice, {
      caja,
      operacion: 6,
      documento: getDocumento(),
    });
  }
}

class CapasuSaleBackend implements SaleBackend {
  readonly kind = 'capasu' as const;

  readonly usesLiveTicket = false;

  // La caja de autoservicio no tiene balanza: el control de peso, cuando
  // existe, ya lo hizo el colector antes de traspasar la compra.
  readonly usesScale = false;

  private readonly terminalCode: string;

  constructor(terminalCode: string) {
    this.terminalCode = terminalCode;
  }

  async lookupProduct(barcode: string): Promise<SaleProduct | null> {
    const product = await CapasuService.productByBarcode(barcode);

    if (!product) return null;

    return {
      productId: product.id,
      // POSsible PDV identifica por id; el sku es para mostrar, y puede faltar.
      codigo: String(product.id),
      barcode,
      descripcion: product.name,
      descripcionCorta: product.name,
      precio: product.unit_price ?? 0,
      pesoGramos: product.weight_grams,
      // No hay pesables de salon en este flujo: el peso es unitario y fijo, y
      // el codigo de barras no lo lleva adentro.
      esPesable: false,
      // La miniatura antes que la grande: esto termina en una linea del
      // carrito, no en una ficha de producto, y el modulo genera las dos
      // justamente para no mandar una imagen de 400px a una fila de lista.
      imagen: product.thumbnail_url ?? product.image_url ?? '',
    };
  }

  /**
   * Una compra sin nombre es, literalmente, una compra sin cliente.
   *
   * Archi necesita un documento centinela porque su ticket siempre va a nombre
   * de alguien; aca la relacion es nullable, asi que no hace falta inventar un
   * cliente que despues aparezca en los reportes como si fuera real.
   */
  /** Suelta la compra sin cerrar que haya quedado en la terminal. */
  beginPurchase(): Promise<void> {
    return this.clearCart();
  }

  async beginAnonymousInvoice(): Promise<SaleInvoice> {
    return {
      razonSocial: 'Sin Nombre',
      documento: '',
      facturaNro: 0,
      customerId: null,
    };
  }

  async findCustomer(document: string): Promise<SaleCustomer | null> {
    const customer = await CapasuService.customerByDocument(document);

    if (!customer) return null;

    return {
      id: customer.id,
      document: customer.document,
      nombre: customer.name,
      raw: customer,
    };
  }

  async registerCustomer(document: string, nombre: string): Promise<SaleCustomer> {
    const customer = await CapasuService.registerCustomer(document, nombre);

    return {
      id: customer.id,
      document: customer.document,
      nombre: customer.name,
      raw: customer,
    };
  }

  /**
   * No hay factura que abrir: la compra recien nace al confirmar el carrito.
   * Lo unico que hace falta guardar es a quien facturarsela.
   */
  async beginNamedInvoice(customer: SaleCustomer): Promise<SaleInvoice> {
    return {
      razonSocial: customer.nombre,
      documento: customer.document,
      facturaNro: 0,
      customerId: customer.id ?? null,
      clientData: customer.raw,
    };
  }

  /**
   * Cobro simulado.
   *
   * No hay pasarela en esta terminal, asi que lo unico que ocurre de verdad es
   * que la compra queda cerrada del lado de POSsible PDV. El resultado no trae
   * numero de autorizacion ni datos de tarjeta: inventarlos haria que un pago
   * que nunca paso se vea en pantalla igual que uno real.
   *
   * El uuid lo dejo la pantalla de venta al confirmar el carrito. Si no esta,
   * la compra no llego a crearse y no hay nada que cobrar: es un error de
   * verdad y se corta, en vez de mostrar un exito que no cierra nada.
   */
  async processPayment(): Promise<SalePaymentResult> {
    const uuid = sessionStorage.getItem(CAPASU_SESSION_KEY);

    if (!uuid) {
      throw new Error('No hay compra que cobrar: el carrito no se llego a confirmar');
    }

    await CapasuService.pay(uuid);
    sessionStorage.removeItem(CAPASU_SESSION_KEY);

    // Sin campos: el cliente que esta frente a la caja no tiene por que leer
    // como esta armada la terminal por dentro, y la pantalla ya muestra su
    // mensaje de exito traducido cuando el resultado no trae ninguno.
    return {};
  }

  /** La bolsa es un producto mas: se la busca por su codigo de barras. */
  addBag(): Promise<SaleProduct | null> {
    if (!CAPASU_BAG_BARCODE) {
      console.warn('Sin VITE_CAPASU_BAG_BARCODE configurado: no se puede agregar la bolsa');
      return Promise.resolve(null);
    }

    return this.lookupProduct(CAPASU_BAG_BARCODE);
  }

  async submitCart(
    lines: SaleLine[],
    expectedWeightGrams?: number,
    customerId?: number | null,
  ): Promise<SaleSubmitResult> {
    // Una linea sin id no se puede mandar, y descartarla en silencio dejaria
    // salir al cliente con un producto que nadie le cobro. Se corta el envio
    // entero: es un carrito que no se armo por esta pantalla, y eso es un bug
    // que hay que ver, no algo para disimular.
    const huerfana = lines.find((line) => line.productId === undefined);

    if (huerfana) {
      throw new Error(`El producto ${huerfana.barcode} no tiene id de POSsible PDV`);
    }

    const items = lines.map((line) => ({
      product_id: line.productId as number,
      quantity: line.cantidad,
    }));

    const session = await CapasuService.submitCart(
      this.terminalCode,
      items,
      expectedWeightGrams,
      customerId,
    );

    return { sessionUuid: session.uuid };
  }

  clearCart(): Promise<void> {
    return CapasuService.clearCart(this.terminalCode);
  }

  async saveProductWeight(ref: SaleWeightRef, weightGrams: number): Promise<number> {
    if (ref.productId === undefined) {
      throw new Error('No se puede guardar el peso sin el id del producto');
    }

    const product = await CapasuService.saveProductWeight(ref.productId, weightGrams);

    return product.weight_grams ?? weightGrams;
  }

  /** El carrito viaja entero o no viaja: no queda nada a medio cargar. */
  async recoverFromSubmitError(): Promise<void> {}
}

const SALE_BACKEND_KIND: SaleBackendKind =
  (import.meta.env.VITE_SALE_BACKEND as SaleBackendKind) === 'capasu' ? 'capasu' : 'archi';

const backend: SaleBackend =
  SALE_BACKEND_KIND === 'capasu'
    ? new CapasuSaleBackend(CAPASU_TERMINAL_CODE)
    : new ArchiSaleBackend();

/** Backend de venta configurado para esta terminal. */
export function getSaleBackend(): SaleBackend {
  return backend;
}

export default getSaleBackend;
