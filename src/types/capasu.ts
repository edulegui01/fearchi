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
