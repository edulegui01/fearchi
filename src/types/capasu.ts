export interface CapasuSessionItem {
  product_id: number;
  name: string | null;
  sku: string | null;
  thumbnail_url: string | null;
  quantity: number;
  unit_weight_grams: number | null;
  line_weight_grams: number | null;
  unit_price: number | null;
  line_total: number | null;
}

export interface CapasuSession {
  uuid: string;
  status: string;
  checkout_terminal_code: string | null;
  expected_weight_grams: number | null;
  measured_weight_grams: number | null;
  items: CapasuSessionItem[];
  total: number;
  handed_off_at: string | null;
  paid_at: string | null;
}

/** Ficha que devuelve POSsible PDV al escanear o al pesar un producto. */
export interface CapasuProduct {
  id: number;
  sku: string | null;
  name: string;
  /** Nulo cuando el producto todavia no fue pesado. */
  weight_grams: number | null;
  has_weight: boolean;
  unit_price: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
}

/** Linea del carrito tal como la espera el cierre de la terminal. */
export interface CapasuCartItem {
  product_id: number;
  quantity: number;
}

/** Cliente al que se le factura una compra. */
export interface CapasuCustomer {
  id: number;
  name: string;
  ruc: string | null;
  dv: string | null;
  /** RUC y verificador rearmados, tal como los tecleo el cliente. */
  document: string;
}
