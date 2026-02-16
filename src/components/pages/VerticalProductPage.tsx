import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import scoLogo from '../../assets/sco-logo.png';
import ScaleModal from '../components/ScaleModal';
import ProductItem from '../components/ProductItem';
import PaymentModal from '../components/PaymentModal';
import { socketService } from '../../services/SocketService';
import { barcodeService } from '../../services/BarcodeService';
import ProductService from '../../services/product/ProductService';
import type { Product, ProductQuantities, LocationState, UserProps } from '../../types';

export default function VerticalProductPage({ userName: propUserName = "Usuario",cedula = "" }: UserProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>({});
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const processedScannedProduct = useRef(false);
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [_scaleConnected, setScaleConnected] = useState(false);
  const [hasWeightChanged, setHasWeightChanged] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Obtener userName y cedula desde sessionStorage o location.state o props
  const getUsername = () => {
    const sessionData = sessionStorage.getItem('currentOrder');
    if (sessionData) {
      const orderData = JSON.parse(sessionData);
      return orderData.userName;
    }
    return locationState?.userName || propUserName;
  };

  const getCedula = () => {
    const sessionData = sessionStorage.getItem('currentOrder');
    if (sessionData) {
      const orderData = JSON.parse(sessionData);
      return orderData.cedula;
    }
    return locationState?.cedula || cedula;
  };
  
  const userName = getUsername();
  const userCedula = getCedula();

  useEffect(() => {
    console.log('🔄 VerticalProductPage montado - Cargando productos...');

    // Verificar si viene un producto escaneado desde WelcomeScreen (solo procesar una vez)
    if (locationState?.fromBarcodeScan && locationState?.scannedProduct && !processedScannedProduct.current) {
      console.log('📦 Producto recibido desde WelcomeScreen:', locationState.scannedProduct);
      processedScannedProduct.current = true;
      handleProductFromWelcome(locationState.scannedProduct);
    }

    // Intentar obtener datos del sessionStorage primero, luego del location.state
    const sessionData = sessionStorage.getItem('currentOrder');
    console.log('📱 SessionStorage data:', sessionData);
    let orderData = null;
    
    if (sessionData) {
      orderData = JSON.parse(sessionData);
      console.log('📦 Productos cargados desde sessionStorage:', orderData);
    } else if (locationState && locationState.products) {
      orderData = locationState;
      console.log('📦 Productos recibidos desde location.state:', locationState);
    } else {
      console.log('⚠️ No se encontraron productos en sessionStorage ni location.state');
    }
    
    if (orderData && orderData.products) {
      setProducts(orderData.products);
      
      // Inicializar cantidades con 1 para cada producto
      const initialQuantities: ProductQuantities = {};
      orderData.products.forEach((product: Product) => {
        initialQuantities[product.cod_barra] = 1;
      });
      setProductQuantities(initialQuantities);
    }
    
    // Configurar mensaje inicial del modal
    setModalMessage(`Hola ${userName}, ponga los productos en la balanza`);
  }, [userName, locationState]);

  // useEffect separado para asegurar que el socket siempre se conecte
  useEffect(() => {
    console.log('Reconectando socket de balanza...');
    
    // Resetear estado de peso para permitir nueva validación
    setScaleWeight(0);
    setHasWeightChanged(false);
    
    // Configurar callbacks del socket de la balanza
    socketService.setCallbacks({
      onScaleWeightUpdate: (weight) => {
        console.log('Peso recibido de la balanza:', weight);
        setScaleWeight(weight);
      },
      onConnectionChange: (connected, socketType) => {
        if (socketType === 'scale') {
          console.log('Estado conexión balanza:', connected);
          setScaleConnected(connected);
        }
      },
      onError: (error, socketType) => {
        console.error(`Error en ${socketType} socket:`, error);
      }
    });
    
    // Conectar socket de la balanza
    socketService.connectScaleSocket();
    
    // Configurar callback para códigos de barras
    barcodeService.setOnBarcodeScanned(handleBarcodeScanned);
    
    // Iniciar escucha de códigos de barras
    barcodeService.startListening();
    
    // Cleanup al desmontar
    return () => {
      console.log('Desconectando socket de balanza...');
      socketService.disconnectScaleSocket();
      barcodeService.stopListening();
    };
  }, []); // Solo se ejecuta al montar/desmontar

  // Función para manejar producto recibido desde WelcomeScreen
  const handleProductFromWelcome = (product: Product) => {
    try {
      console.log('🎯 Procesando producto desde WelcomeScreen:', product);

      // Verificar si el producto ya está en la lista
      const existingProduct = products.find(p => p.cod_barra === product.cod_barra);

      if (existingProduct) {
        // Si ya existe, incrementar cantidad
        setProductQuantities(prev => ({
          ...prev,
          [product.cod_barra]: (prev[product.cod_barra] || 1) + 1
        }));
        console.log('✅ Cantidad incrementada para:', product.name);
      } else {
        // Si no existe, agregar a la lista
        setProducts(prev => [...prev, product]);
        setProductQuantities(prev => ({
          ...prev,
          [product.cod_barra]: 1
        }));

        console.log('✅ Producto agregado desde WelcomeScreen:', product.name);

        // Actualizar sessionStorage
        setTimeout(() => {
          const updatedProducts = [...products, product];
          const orderData = {
            products: updatedProducts,
            totalItems: updatedProducts.length,
            userName: userName,
            cedula: userCedula,
            timestamp: new Date().toISOString(),
            source: 'welcome_barcode'
          };
          sessionStorage.setItem('currentOrder', JSON.stringify(orderData));
          console.log('💾 SessionStorage actualizado desde WelcomeScreen');
        }, 100);
      }
    } catch (error) {
      console.error('💥 Error al procesar producto desde WelcomeScreen:', error);
    }
  };

  // Función para manejar códigos de barras escaneados
  const handleBarcodeScanned = async (barcode: string) => {
    console.log('Procesando código de barras:', barcode);

    try {
      // Buscar producto por código de barras
      const product: Product | null = await ProductService.getProductByBarcodeApi(barcode);

      if (product) {
        // Usar callback para acceder al estado actual de products (evita stale closure)
        setProducts(prevProducts => {
          const existingProduct = prevProducts.find(p => p.cod_barra === product.cod_barra);

          if (existingProduct) {
            // Si ya existe, no modificar products
            console.log('Cantidad incrementada para:', product.name);
            return prevProducts;
          } else {
            // Si no existe, agregar a la lista
            console.log('Producto agregado:', product.name);
            const updatedProducts = [...prevProducts, product];

            // Actualizar sessionStorage
            const orderData = {
              products: updatedProducts,
              totalItems: updatedProducts.length,
              userName: userName,
              cedula: userCedula,
              timestamp: new Date().toISOString(),
              source: 'barcode'
            };
            sessionStorage.setItem('currentOrder', JSON.stringify(orderData));

            return updatedProducts;
          }
        });

        // Siempre incrementar la cantidad (funciona para nuevo y existente)
        setProductQuantities(prev => ({
          ...prev,
          [product.cod_barra]: (prev[product.cod_barra] || 0) + 1
        }));

      } else {
        console.log('Producto no encontrado para código:', barcode);
      }
    } catch (error) {
      console.error('Error al buscar producto por código de barras:', error);
    }
  };

  // useEffect para validar peso cuando cambien scaleWeight o products
  useEffect(() => {
    // Solo ejecutar validateWeight cuando el peso cambie por primera vez de 0
    if (!hasWeightChanged && scaleWeight > 0) {
      setHasWeightChanged(true);
      validateWeight(products, scaleWeight);
    } else if (hasWeightChanged) {
      // Validar siempre que hasWeightChanged sea true, incluso si el peso es 0
      validateWeight(products, scaleWeight);
    }
  }, [scaleWeight, products, hasWeightChanged]);

  const handlePagar = () => {
    console.log('Abriendo modal de datos de facturación...');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentConfirm = (ruc: string, razonSocial: string) => {
    console.log('Procesando pago con datos:', { ruc, razonSocial });
    
    // Calcular total considerando las cantidades
    const totalAmount = products.reduce((total, product) => {
      const quantity = productQuantities[product.cod_barra] || 1;
      return total + (product.precio * quantity);
    }, 0);
    
    // Cerrar modal
    setIsPaymentModalOpen(false);
    
    // Navegar a página de pago con los datos
    navigate('/payment', { 
      state: { 
        products, 
        totalAmount,
        ruc,
        razonSocial,
        productQuantities
      } 
    });
  };

  const handlePaymentCancel = () => {
    setIsPaymentModalOpen(false);
  };

  const handleCancelar = () => {
    console.log('Cancelando orden...');
    setProducts([]);
    setProductQuantities({});
    // Limpiar sessionStorage
    sessionStorage.removeItem('currentOrder');
    navigate('/welcome');
  };


  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.cod_barra !== productId));
    setProductQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  const validateWeight = (products: Product[], currentWeight?: number) => {
    // Los pesos de productos vienen en gramos, convertir a kg para comparar con la balanza
    const totalWeightGrams = products.reduce((sum, product) => sum + product.peso, 0);
    const totalWeightKg = totalWeightGrams / 1000;
    let valid = false;
    const variationKg = 0.06; // 20 gramos de tolerancia en kg

    if (currentWeight !== undefined) {
      console.log('products:', products);
      console.log('totalWeight:', totalWeightKg, 'kg, currentWeight:', currentWeight, 'kg');
      console.log('products:', products);
      
      // Mostrar modal si la balanza lee entre 0-10g
      if (currentWeight >= 0 && currentWeight <= 0.01) {
        setModalMessage('Los productos no coinciden con la lista');
        setIsModalOpen(true);
        return;
      }
      
      // Validar diferencia de peso con tolerancia de 20g
      valid = Math.abs(totalWeightKg - currentWeight) <= variationKg;
    }

    if (valid) {
      setModalMessage('Peso validado correctamente. Puede proceder al pago.');
      setIsModalOpen(false);
    } else {
      setModalMessage('Los productos no coinciden con la lista');
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-primary-400 flex flex-col p-7">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={scoLogo} 
              alt="Fe-SCO"
              className="h-auto w-96"
            />
          </div>
          {/* Welcome Message */}
          <h2 className="text-4xl font-semibold text-primary-400 text-center mb-3">
            Hola {userName}
          </h2>
          {/* <h1 className="text-6xl font-bold text-primary-400 text-center">
            Lista de Productos
          </h1> */}
        </div>

      {/* Products List */}
      <div className="h-[63vh] mb-6 overflow-y-auto bg-primary-50 rounded-lg shadow-inner">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-secondary-800 text-4xl font-semibold">
                No hay productos<br />disponibles
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Headers */}
            <div className="flex items-center gap-8 mb-6 px-6">
              <div className="flex-shrink-0 w-24"></div> {/* Space for image */}
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">Producto</div>
              </div>
              <div className="text-center flex-shrink-0 w-28">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">Cantidad</div>
              </div>
              <div className="text-center flex-shrink-0 w-32">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">Precio</div>
              </div>
              <div className="text-center flex-shrink-0 w-32">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">Sub Total</div>
              </div>
              <div className="flex-shrink-0 w-14"></div> {/* Space for delete button */}
            </div>
            
            {/* Products */}
            <div className="space-y-4">
              {products.map((product, index) => (
                <ProductItem 
                  key={product.cod_barra || index}
                  product={product}
                  index={index}
                  quantity={productQuantities[product.cod_barra] || 1}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Total General */}
      <div className="bg-primary-50 rounded-lg shadow-sm p-11 mb-4 mt-1">
        <div className="flex justify-end">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-semibold text-gray-700">
               Total a Pagar:
            </div>
            <div className="text-5xl font-bold text-primary-400">
              ₲{products.reduce((total, product) => {
                const quantity = productQuantities[product.cod_barra] || 1;
                return total + (product.precio * quantity);
              }, 0).toLocaleString('es-PY')}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mt-3">
        <button
          onClick={handlePagar}
          disabled={products.length === 0}
          className="w-full bg-primary-50 text-black py-11 rounded-lg text-4xl font-semibold min-w-64
                    
                     
                     "
        >
          Pagar  
        </button>
        
        <button
          onClick={handleCancelar}
          className="w-full bg-primary-50 text-black py-6 rounded-lg text-4xl font-semibold min-w-64
                     hover:bg-secondary-700 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
        >
          Cancelar
        </button>
      </div>
      </div>

      {/* Modal de Balanza */}
      <ScaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
        userName={userName}
      />

      {/* Modal de Pago */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        totalAmount={products.reduce((total, product) => {
          const quantity = productQuantities[product.cod_barra] || 1;
          return total + (product.precio * quantity);
        }, 0)}
        cedula={userCedula}
        userName={userName}
      />
    </div>
  );
}