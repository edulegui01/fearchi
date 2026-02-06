import type { Product } from './product';

// Props para ProductItem
export interface ProductItemProps {
  product: Product;
  index: number;
  quantity?: number;
  onDelete?: (productId: string) => void;
  onIncrement?: (productId: string) => void;
  onDecrement?: (productId: string) => void;
}

// Props para ScaleModal
export interface ScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  userName: string;
}

// Props para PaymentModal
export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ruc: string, razonSocial: string) => void;
  totalAmount: number;
  cedula: string;
  userName: string;
}

// Props para TicketReceipt
export interface TicketReceiptProps {
  products: Product[];
  totalAmount: number;
  ruc: string;
  razonSocial: string;
  userName: string;
  cedula: string;
}

// Props para WelcomeScreen
export interface WelcomeScreenProps {
  userName?: string;
  cedula?: string;
}