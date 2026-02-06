import { Product } from './product';
import { User } from './user';

// Datos recibidos por socket
export interface SocketData {
  data: {
    orders: Product[];
    total_items: number;
  };
  timestamp: string;
  source: string;
  user: User;
}

// Callbacks para el servicio de socket
export interface SocketCallbacks {
  onProductsUpdate?: (data: SocketData) => void;
  onScaleWeightUpdate?: (weight: number) => void;
  onConnectionChange?: (connected: boolean, socketType: 'main' | 'scale') => void;
  onError?: (error: any, socketType: 'main' | 'scale') => void;
}