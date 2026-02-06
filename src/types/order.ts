import { Product, ProductQuantities } from './product';
import { User } from './user';

// Estado de la orden/pedido
export interface LocationState {
  products: Product[];
  totalItems: number;
  userName: string;
  timestamp: string;
  source: string;
  cedula?: string;
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