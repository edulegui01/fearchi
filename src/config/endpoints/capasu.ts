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

  /** Ficha de un producto escaneado. 404 si el codigo no existe. */
  productByBarcode: (barcode: string) =>
    `${BASE}/capasu/products/by-barcode/${encodeURIComponent(barcode)}`,

  /** Peso unitario medido en la terminal, para un producto que no lo tenia. */
  productWeight: (productId: number) =>
    `${BASE}/capasu/products/${productId}/weight`,

  /** Cliente al que facturarle. 404 si no esta en el padron. */
  customerByDocument: (document: string) =>
    `${BASE}/capasu/customers/by-document/${encodeURIComponent(document)}`,

  /** Alta del cliente que la terminal acaba de tipear. */
  customers: `${BASE}/capasu/customers`,

  /** Compra traspasada a esta terminal. 404 mientras no llego nadie. */
  currentSession: (terminalCode: string) =>
    `${BASE}/capasu/checkout/${encodeURIComponent(terminalCode)}/session`,

  /**
   * Carrito armado escaneando en la propia terminal. POST lo cierra y lo deja
   * listo para cobrar; DELETE descarta el que haya quedado sin cerrar.
   */
  checkoutCart: (terminalCode: string) =>
    `${BASE}/capasu/checkout/${encodeURIComponent(terminalCode)}/cart`,

  /** Cierra la compra cobrada. */
  pay: (uuid: string) => `${BASE}/capasu/sessions/${encodeURIComponent(uuid)}/pay`,

  /** Suelta la compra sin cobrarla y libera la terminal. */
  release: (uuid: string) => `${BASE}/capasu/sessions/${encodeURIComponent(uuid)}/release`,
};

/** Codigo de esta terminal. Es lo que viaja dentro del QR. */
export const CAPASU_TERMINAL_CODE =
  (import.meta.env.VITE_CAPASU_TERMINAL_CODE as string) ?? 'SCO-01';

/**
 * Codigo de barras de la bolsa.
 *
 * La bolsa se cobra como cualquier otro producto: no hay nada especial que
 * hacer con ella salvo saber cual es, y eso cambia de instalacion en
 * instalacion.
 */
export const CAPASU_BAG_BARCODE =
  (import.meta.env.VITE_CAPASU_BAG_BARCODE as string) ?? '';

/** Prefijo que el colector usa para distinguir el QR de una caja. */
export const CAPASU_TERMINAL_QR_PREFIX = 'capasu:terminal:';
