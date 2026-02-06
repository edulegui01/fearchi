export interface VentasAut {
  id: number;
  zeta: number;
  caja: number;
  ticket: number;
  operacion: number;
  codigo: string;
  codigo_barra: string;
  cantidad: number;
  precio: number;
  total_venta: number;
  tipo_cobro: number;
  cod_condicion: number;
  bin: string;
  cod_tarjeta: number;
  nro_boleta: string;
  cod_autorizacion: string;
  tipo_qr: string;
  importe_cobrado: number;
  estado: number;
  obs: string;
  documento: string;
  nombre_cliente: string;
  nro_ecom: number;
  issuerid?: string;
  nombre_tarjeta?: string;
  nombre_cli_tarj?: string;
}
