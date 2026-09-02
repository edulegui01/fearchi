/**
 * Endpoints del modulo Capasu de POSsible PDV.
 *
 * Es un backend distinto al del resto del SCO: aca vive la compra que el
 * cliente armo con el colector y que la balanza ya valido. Por eso tiene su
 * propia base y su propio token, en vez de colgarse de VITE_API_BASE_URL.
 */
const BASE = (import.meta.env.VITE_CAPASU_API_URL as string) ?? '';

export const CAPASU_ENDPOINTS = {
  login: `${BASE}/login`,

  /** Compra traspasada a esta terminal. 404 mientras no llego nadie. */
  currentSession: (terminalCode: string) =>
    `${BASE}/capasu/checkout/${encodeURIComponent(terminalCode)}/session`,
};

/** Codigo de esta terminal. Es lo que viaja dentro del QR. */
export const CAPASU_TERMINAL_CODE =
  (import.meta.env.VITE_CAPASU_TERMINAL_CODE as string) ?? 'SCO-01';

/** Prefijo que el colector usa para distinguir el QR de una caja. */
export const CAPASU_TERMINAL_QR_PREFIX = 'capasu:terminal:';
