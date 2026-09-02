import { CAPASU_ENDPOINTS } from '../config/endpoints/capasu';
import type { CapasuSession } from '../types/capasu';

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
   * Compra traspasada a esta terminal, o null si todavia no hay ninguna.
   *
   * El 404 es la respuesta normal mientras nadie escaneo el QR: se traduce a
   * null en vez de propagarse como error, porque la pantalla lo consulta una
   * vez por segundo y no es una falla.
   *
   * Un 401 significa token vencido: se renueva una sola vez y se reintenta.
   */
  static async currentSession(
    terminalCode: string,
    retryOnAuthError = true,
  ): Promise<CapasuSession | null> {
    let token = this.token();
    if (!token) token = await this.login();

    const response = await fetch(CAPASU_ENDPOINTS.currentSession(terminalCode), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) return null;

    if (response.status === 401 && retryOnAuthError) {
      localStorage.removeItem(TOKEN_KEY);
      await this.login();
      return this.currentSession(terminalCode, false);
    }

    if (!response.ok) {
      throw new Error(`No se pudo consultar la compra (${response.status})`);
    }

    return (await response.json()) as CapasuSession;
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
  private static async close(
    url: string,
    mensajeError: string,
    retryOnAuthError = true,
  ): Promise<void> {
    let token = this.token();
    if (!token) token = await this.login();

    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 && retryOnAuthError) {
      localStorage.removeItem(TOKEN_KEY);
      await this.login();
      return this.close(url, mensajeError, false);
    }

    if (!response.ok) {
      throw new Error(`${mensajeError} (${response.status})`);
    }
  }
}

export default CapasuService;
