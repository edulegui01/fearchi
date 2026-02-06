import { io, Socket } from 'socket.io-client';
import type { SocketData, SocketCallbacks } from '../types';

class SocketService {
  private mainSocket: Socket | null = null;
  private scaleSocket: WebSocket | null = null;
  private callbacks: SocketCallbacks = {};

  // Registrar callbacks
  setCallbacks(callbacks: SocketCallbacks) {
    this.callbacks = callbacks;
  }

  // Conectar socket principal (productos)
  connectMainSocket() {
    try {
      if (this.mainSocket?.connected) {
        console.log('🟢 Socket principal ya está conectado');
        return;
      }

      const mainSocketUrl = import.meta.env.VITE_SOCKET_MAIN_URL || 'http://localhost:3000';
      console.log('🔄 Intentando conectar socket principal a:', mainSocketUrl);
      
      this.mainSocket = io(mainSocketUrl, {
        withCredentials: false,
        transports: ['polling'],
      });

      this.mainSocket.on('connect', () => {
        console.log('🟢 CONECTADO a Socket.IO principal');
        this.callbacks.onConnectionChange?.(true, 'main');
      });

      this.mainSocket.on('product-update', (data: SocketData) => {
        console.log('Datos de productos recibidos:', data);
        if (data && data.data.orders) {
          this.callbacks.onProductsUpdate?.(data);
        }
      });

      this.mainSocket.on('disconnect', (reason) => {
        console.log('Socket principal desconectado:', reason);
        this.callbacks.onConnectionChange?.(false, 'main');
      });

      this.mainSocket.on('connect_error', (error) => {
        console.error('Error de conexión Socket principal:', error);
        this.callbacks.onError?.(error, 'main');
        this.callbacks.onConnectionChange?.(false, 'main');
      });

    } catch (error) {
      console.error('Error al conectar Socket principal:', error);
      this.callbacks.onError?.(error, 'main');
    }
  }

  // Conectar WebSocket de balanza
  connectScaleSocket() {
    try {
      if (this.scaleSocket?.readyState === WebSocket.OPEN) {
        console.log('Socket de balanza ya está conectado');
        return;
      }

      const scaleSocketUrl = import.meta.env.VITE_SOCKET_SCALE_URL || 'ws://localhost:8080';
      this.scaleSocket = new WebSocket(scaleSocketUrl);

      this.scaleSocket.onopen = () => {
        console.log('Conectado al WebSocket de Balanza');
        this.callbacks.onConnectionChange?.(true, 'scale');
      };

      this.scaleSocket.onmessage = (event) => {
        console.log('Datos crudos de balanza:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('Datos parseados de balanza:', data);
          
          if (data.type === 'weight_update') {
            // Extraer el número del string (ej: "ST NW +   0.007 kg" -> 0.007)
            const weightString = data.weight.toString();
            const weightMatch = weightString.match(/[+-]?\d*\.?\d+/);
            
            if (weightMatch) {
              const weight = parseFloat(weightMatch[0]);
              console.log('Peso extraído:', weight, 'kg');
              
              if (!isNaN(weight)) {
                this.callbacks.onScaleWeightUpdate?.(weight);
              }
            } else {
              console.error('No se pudo extraer el peso del string:', data.weight);
            }
          }
        } catch (error) {
          console.error('Error al parsear datos de balanza:', error);
          this.callbacks.onError?.(error, 'scale');
        }
      };

      this.scaleSocket.onclose = () => {
        console.log('WebSocket de balanza desconectado');
        this.callbacks.onConnectionChange?.(false, 'scale');
      };

      this.scaleSocket.onerror = (error) => {
        console.error('Error en WebSocket de balanza:', error);
        this.callbacks.onError?.(error, 'scale');
        this.callbacks.onConnectionChange?.(false, 'scale');
      };

    } catch (error) {
      console.error('Error al conectar WebSocket de balanza:', error);
      this.callbacks.onError?.(error, 'scale');
    }
  }

  // Conectar ambos sockets
  connectAll() {
    this.connectMainSocket();
    this.connectScaleSocket();
  }

  // Desconectar socket principal
  disconnectMainSocket() {
    if (this.mainSocket) {
      this.mainSocket.disconnect();
      this.mainSocket = null;
    }
  }

  // Desconectar WebSocket de balanza
  disconnectScaleSocket() {
    if (this.scaleSocket) {
      this.scaleSocket.close();
      this.scaleSocket = null;
    }
  }

  // Desconectar todos
  disconnectAll() {
    this.disconnectMainSocket();
    this.disconnectScaleSocket();
  }

  // Getters de estado de conexión
  get isMainSocketConnected(): boolean {
    return this.mainSocket?.connected || false;
  }

  get isScaleSocketConnected(): boolean {
    return this.scaleSocket?.readyState === WebSocket.OPEN || false;
  }

  // Cleanup
  destroy() {
    this.disconnectAll();
    this.callbacks = {};
  }
}

// Singleton instance
export const socketService = new SocketService();
export default SocketService;