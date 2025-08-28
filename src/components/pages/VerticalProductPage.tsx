import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scoLogo from '../../assets/sco-logo.png';
import ScaleModal from '../components/ScaleModal';
import { socketService } from '../../services/SocketService';

interface Product {
  cod_barra: string;
  description: string;
  category_id: number;
  name: string;
  sku: string;
  imagen: string;
  precio: number;
  peso: number;
  es_pesable: boolean;
  purchase_price: number;
  tax: number;
  stock: number;
  stock_min: number;
  active: boolean;
}

interface SocketData {
  data: {
    orders: Product[];
  };
}

interface VerticalProductPageProps {
  userName?: string;
}

export default function VerticalProductPage({ userName = "Usuario" }: VerticalProductPageProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [hasWeightChanged, setHasWeightChanged] = useState(false);


  useEffect(() => {
    // Configurar mensaje inicial del modal
    setModalMessage(`Bienvenido/a ${userName}, por favor ponga los productos en la balanza`);
    
    // Configurar callbacks del servicio
    socketService.setCallbacks({
      onProductsUpdate: (products) => {
        setProducts(products);
      },
      onScaleWeightUpdate: (weight) => {
        setScaleWeight(weight);
      },
      onConnectionChange: (connected, socketType) => {
        if (socketType === 'main') {
          setSocketConnected(connected);
        } else if (socketType === 'scale') {
          setScaleConnected(connected);
        }
      },
      onError: (error, socketType) => {
        console.error(`Error en ${socketType} socket:`, error);
      }
    });
    
    // Conectar todos los sockets
    socketService.connectAll();
    
    // Cleanup function
    return () => {
      socketService.destroy();
    };
  }, [userName]);

  // useEffect para validar peso cuando cambien scaleWeight o products
  useEffect(() => {
    // Solo ejecutar validateWeight cuando el peso cambie por primera vez de 0
    if (!hasWeightChanged && scaleWeight > 0) {
      setHasWeightChanged(true);
      validateWeight(products, scaleWeight);
    } else if (hasWeightChanged && scaleWeight > 0) {
      validateWeight(products, scaleWeight);
    }
  }, [scaleWeight, products, hasWeightChanged]);

  const handlePagar = () => {
    console.log('Procesando pago...');
    
    // Calcular total
    const totalAmount = products.reduce((total, product) => {
      return total + product.precio;
    }, 0);
    
    // Navegar a página de pago con los datos
    navigate('/payment', { 
      state: { 
        products, 
        totalAmount 
      } 
    });
  };

  const handleCancelar = () => {
    console.log('Cancelando orden...');
    setProducts([]);
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
    <div className="min-h-screen bg-primary-400 flex flex-col p-6">
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
          <h2 className="text-4xl font-semibold text-primary-700 text-center mb-3">
            Bienvenido/a {userName}
          </h2>
          <h1 className="text-6xl font-bold text-primary-600 text-center">
            Lista de Productos
          </h1>
        </div>

      {/* Products List */}
      <div className="h-[65vh] space-y-4 mb-6 overflow-y-auto bg-primary-50 p-6 rounded-lg shadow-inner">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-secondary-800 text-4xl font-semibold">
                No hay productos<br />disponibles
              </p>
            </div>
          </div>
        ) : (
          products.map((product, index) => (
            <div key={product.cod_barra || index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-start space-x-6">
                {/* Product Image */}
                <div className="w-28 h-28 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  {product.imagen ? (
                    <img
                      src={product.imagen}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="text-gray-400 text-xs text-center hidden">
                    Sin imagen
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 text-xl truncate pr-2">
                      {product.name}
                    </h3>
                    <span className="text-2xl font-bold text-primary-600 whitespace-nowrap">
                      ${product.precio.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-base mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Código:</span> {product.cod_barra}
                    </div>
                    <div>
                      <span className="font-medium">Categoría:</span> {product.category_id}
                    </div>
                  </div>

                  {product.es_pesable && (
                    <div className="mt-3">
                      <span className="inline-block bg-orange-100 text-orange-800 text-sm px-3 py-2 rounded-full">
                        Producto Pesable
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-8 mt-auto">
        <button
          onClick={handlePagar}
          disabled={products.length === 0}
          className="bg-primary-600 text-white py-6 px-20 rounded-lg text-2xl font-semibold min-w-64
                     hover:bg-primary-700 transition-colors duration-200 
                     disabled:bg-primary-300 disabled:cursor-not-allowed disabled:opacity-60
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Pagar
        </button>
        
        <button
          onClick={handleCancelar}
          className="bg-secondary-600 text-black py-6 px-20 rounded-lg text-2xl font-semibold min-w-64
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
    </div>
  );
}