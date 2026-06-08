const BASE = import.meta.env.VITE_API_BASE_URL as string;

export const ARCHI_ENDPOINTS = {
  // Productos
  consultaProducto: (barcode: string) => `${BASE}/pos/productos/consulta/${barcode}`,
  scanProducto: `${BASE}/pos/productos/scan`,
  scanningPeso: `${BASE}/scanning-peso`,

  // Ventas automatizadas
  ticketClean: `${BASE}/pos/ventas-aut/ticket-clean`,
  createInvoice: `${BASE}/pos/ventas-aut/create-invoice`,
  insertarProductos: `${BASE}/pos/ventas-aut/insertar-productos`,
  findClientDetails: `${BASE}/pos/ventas-aut/find-client-details`,
  registerClient: `${BASE}/pos/ventas-aut/register-client`,
  pagoTarjeta: `${BASE}/pos/ventas-aut/pago-tarjeta`,
  pagoQr: `${BASE}/pos/ventas-aut/pago-qr`,

  // Dispositivos
  bancardVerificarConexion: `${BASE}/bancard/verificar-conexion`,
  abrirPuerta: `${BASE}/access-control/door/open`,

  // Configuración
  cajaConfig: `${BASE}/caja-config/caja`,
};
