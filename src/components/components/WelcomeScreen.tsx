import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scoLogo from '../../assets/sco-logo.png';
import { socketService } from '../../services/SocketService';
import { barcodeService } from '../../services/BarcodeService';
import type { Product } from '../../types';

interface User {
  nombre: string;
  apellido: string;
  cedula: string;
}

interface SocketData {
  data: {
    orders: Product[];
    total_items: number;
  };
  timestamp: string;
  source: string;
  user: User;
}

interface WelcomeScreenProps {
  onContinue?: () => void;
}

export default function WelcomeScreen({ onContinue: _onContinue }: WelcomeScreenProps) {
  console.log('🚀 WelcomeScreen se está renderizando');
  const navigate = useNavigate();
  const [_socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    console.log('🔄 WelcomeScreen montado - Iniciando servicios...');
    // Configurar callbacks del servicio
    socketService.setCallbacks({
      onProductsUpdate: (data: SocketData) => {
        console.log('Datos recibidos en WelcomeScreen:', data);
        
        // Convertir nombres a capital case
        const formatName = (name: string) => {
          return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        };
        
        const formattedName = data.user 
          ? `${formatName(data.user.nombre)} ${formatName(data.user.apellido)}`
          : 'Usuario';
        
        // Guardar datos en sessionStorage para persistencia
        const sessionData = {
          products: data.data.orders,
          totalItems: data.data.total_items,
          userName: formattedName,
          timestamp: data.timestamp,
          source: data.source,
          cedula: data.user.cedula
        };
        sessionStorage.setItem('currentOrder', JSON.stringify(sessionData));
        
        // Navegar a VerticalProductPage
        navigate('/vertical-products');
      },
      onScaleWeightUpdate: (_weight) => {
        // No hacer nada en WelcomeScreen
      },
      onConnectionChange: (connected, socketType) => {
        if (socketType === 'main') {
          setSocketConnected(connected);
        }
      },
      onError: (error, socketType) => {
        console.error(`Error en ${socketType} socket:`, error);
      }
    });
    
    // Conectar todos los sockets
    socketService.connectAll();
    
    // Configurar callback para códigos de barras con API
    console.log('🎯 Configurando callback de código de barras con API...');

    // Escuchar eventos de productos encontrados
    const handleProductFound = (event: CustomEvent) => {
      const product = event.detail.product;
      console.log('✅ Producto capturado en WelcomeScreen:', product);

      // Navegar a VerticalProductPage pasando el producto
      navigate('/vertical-products', {
        state: {
          scannedProduct: product,
          fromBarcodeScan: true
        }
      });
    };

    const handleProductNotFound = (event: CustomEvent) => {
      console.log('❌ Producto no encontrado:', event.detail.barcode);
      alert('Producto no encontrado: ' + event.detail.barcode);
    };

    const handleBarcodeError = (event: CustomEvent) => {
      console.error('💥 Error al buscar producto:', event.detail.error);
      alert('Error al buscar producto: ' + event.detail.barcode);
    };

    // Agregar listeners
    window.addEventListener('productFound', handleProductFound as EventListener);
    window.addEventListener('productNotFound', handleProductNotFound as EventListener);
    window.addEventListener('barcodeError', handleBarcodeError as EventListener);

    // Activar manejo automático con API de productos (devuelve ApiProduct)
    barcodeService.setAutomaticProductAPIHandling(true);
    
    // Iniciar escucha de códigos de barras
    console.log('🎯 Iniciando BarcodeService...');
    barcodeService.startListening();
    
    // Cleanup function
    return () => {
      // Remover listeners
      window.removeEventListener('productFound', handleProductFound as EventListener);
      window.removeEventListener('productNotFound', handleProductNotFound as EventListener);
      window.removeEventListener('barcodeError', handleBarcodeError as EventListener);

      barcodeService.stopListening();
      socketService.destroy();
    };
  }, [navigate]);

  // Función para manejar códigos de barras escaneados en WelcomeScreen
  const handleBarcodeScanned = (barcode: string) => {
    console.log('🔥 CALLBACK EJECUTADO CON CÓDIGO:', barcode);
    alert('Código escaneado: ' + barcode); // Test visual
  };

  return (
    <div className="min-h-screen bg-primary-400 flex items-center justify-center">
      <div className="flex flex-col items-center bg-primary-100 p-40 rounded-lg shadow-lg">
        <img 
          src={scoLogo} 
          alt="Fe-SCO"
          className="h-64 w-auto mb-6"
        />
      </div>
    </div>
  );
}