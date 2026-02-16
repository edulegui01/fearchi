import type { Product, ProductQuantities } from './product';
import type { ApiProduct } from './product';

// Estado de la orden/pedido
export interface LocationState {
  products: Product[];
  totalItems: number;
  userName: string;
  timestamp: string;
  source: string;
  cedula?: string;
  fromBarcodeScan?: boolean;
  scannedProduct?: ApiProduct;
  fromPriceCheck?: boolean;
  fromBagSelection?: boolean;
  productQuantities?: ProductQuantities;
  razonSocial?: string;
  ruc?: string;
}

// Datos de la orden para sessionStorage
export interface OrderData {
  products: Product[];
  totalItems: number;
  userName: string;
  cedula: string;
  timestamp: string;
  source: string;
  productQuantities?: ProductQuantities;
}