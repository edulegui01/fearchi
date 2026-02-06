import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import ProductItem from '../../components/ProductItem';
import { barcodeService } from '../../../services/BarcodeService';
import ProductService from '../../../services/product/ProductService';
import { ApiError } from '../../../utils/ApiError';
import type { Product, ScannedProduct, ProductQuantities } from '../../../types';

interface PriceCheckPageProps {
  onBack?: () => void;
}

export default function PriceCheckPage({ onBack }: PriceCheckPageProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>({});
  const [isActive, setIsActive] = useState(true);

  // useEffect para configurar el servicio de código de barras
  useEffect(() => {
    console.log('✅ PriceCheckPage: Activando escucha de códigos de barras...');
    setIsActive(true);

    // Configurar callback para códigos de barras
    barcodeService.setOnBarcodeScanned(handleBarcodeScanned);

    // Iniciar escucha de códigos de barras
    barcodeService.startListening();

    // Cleanup al desmontar
    return () => {
      console.log('🛑 PriceCheckPage: Desactivando escucha de códigos de barras...');
      setIsActive(false);
      barcodeService.stopListening();
      barcodeService.setOnBarcodeScanned(() => {});
    };
  }, []);

  // Función para manejar códigos de barras escaneados
  const handleBarcodeScanned = async (barcode: string) => {
    if (!isActive) {
      console.log('⚠️ PriceCheckPage no está activo, ignorando escaneo');
      return;
    }

    console.log('✅ PriceCheckPage procesando código de barras:', barcode);

    try {
      const product: ScannedProduct | null = await ProductService.getProductByBarcode(barcode);

      if (product) {
        const mappedProduct: Product = {
          cod_barra: product.codigo_barra_int,
          descripcion: product.descripcion_producto,
          category_id: 0,
          name: product.descripcion_corta,
          sku: product.codigo,
          imagen: '',
          precio: product.precio,
          peso: 0,
          es_pesable: product.pesable === 1,
          purchase_price: 0,
          tax: 0,
          stock: product.nivel3,
          stock_min: 0,
          active: true
        };

        const existingProduct = products.find(p => p.cod_barra === mappedProduct.cod_barra);

        if (existingProduct) {
          setProductQuantities(prev => ({
            ...prev,
            [mappedProduct.cod_barra]: (prev[mappedProduct.cod_barra] || 1) + 1
          }));
          console.log('✅ Cantidad incrementada para:', mappedProduct.name);
        } else {
          setProducts(prev => [...prev, mappedProduct]);
          setProductQuantities(prev => ({
            ...prev,
            [mappedProduct.cod_barra]: 1
          }));
          console.log('✅ Producto agregado:', mappedProduct.name);
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Error de red o timeout primero
        if (error.isNetworkError || error.isTimeoutError) {
          console.error('🔌 Error de conexión:', error);
          alert(error.getUserFriendlyMessage());
        } else if (error.status === 404) {
          const errorMessage = error.response?.message || `Producto con código "${barcode}" no encontrado en el sistema POS`;
          console.warn('❌ Producto no encontrado:', errorMessage);
          alert(errorMessage);
        } else {
          console.error('💥 Error de API:', error);
          alert(error.getUserFriendlyMessage());
        }
      } else {
        console.error('💥 Error inesperado:', error);
        alert('Error inesperado al buscar el producto. Por favor intente nuevamente.');
      }
    }
  };

  const handleAgregar = () => {
    if (products.length === 0) {
      alert('No hay productos para agregar. Escanee al menos un producto.');
      return;
    }

    console.log('📦 Guardando productos consultados para agregar a compra...');

    // Guardar productos consultados en sessionStorage
    sessionStorage.setItem('priceCheckProducts', JSON.stringify({
      products,
      productQuantities
    }));

    // Navegar a selección de tipo de factura
    navigate('/invoice-type-selection');
  };

  const handleVolver = () => {
    console.log('Volviendo al menú principal...');
    setProducts([]);
    setProductQuantities({});
    navigate('/menu');
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.cod_barra !== productId));
    setProductQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  return (
    <div className="h-screen bg-secondary-100 flex flex-col p-2 md:p-3 lg:p-4 xl:p-7 overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-2 md:p-3 lg:p-4 xl:p-8 mb-1 md:mb-2 lg:mb-3 xl:mb-4 flex-shrink-0">
          <div className="flex justify-center mb-1 md:mb-2 lg:mb-3 xl:mb-4">
            <img
              src={archiLogo}
              alt="Archi"
              className="h-auto w-24 md:w-32 lg:w-48 xl:w-96"
            />
          </div>
          <h2 className="text-base md:text-lg lg:text-2xl xl:text-4xl font-semibold text-primary-600 text-center">
            Consulta de Precios
          </h2>
        </div>

        {/* Products List */}
        <div className="flex-1 min-h-0 mb-1 md:mb-2 lg:mb-3 xl:mb-6 overflow-y-auto rounded-lg shadow-inner relative bg-primary-50">
          {/* Logo de fondo */}
          <img
            src={archiLogo}
            alt=""
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 max-w-md opacity-20 pointer-events-none"
          />
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-primary-600 text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold">
                  Escanee los productos<br />para consultar precios
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 md:p-3 lg:p-4 xl:p-6">
              {/* Headers */}
              <div className="flex items-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 mb-2 md:mb-3 lg:mb-4 xl:mb-6 px-2 md:px-3 lg:px-4 xl:px-6">
                <div className="flex-shrink-0 w-12 md:w-14 lg:w-16 xl:w-24"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">Producto</div>
                </div>
                <div className="text-center flex-shrink-0 w-14 md:w-18 lg:w-20 xl:w-28">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">Cantidad</div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">Precio</div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">Sub Total</div>
                </div>
                <div className="flex-shrink-0 w-8 md:w-9 lg:w-10 xl:w-14"></div>
              </div>

              {/* Products */}
              <div className="space-y-1 md:space-y-2 lg:space-y-2 xl:space-y-4">
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
        <div className="bg-primary-50 rounded-lg shadow-sm p-2 md:p-3 lg:p-4 xl:p-11 mb-1 md:mb-2 lg:mb-2 xl:mb-4 flex-shrink-0">
          <div className="flex justify-end">
            <div className="flex items-center gap-2 md:gap-2 lg:gap-3 xl:gap-4">
              <div className="text-base md:text-lg lg:text-xl xl:text-5xl font-semibold text-gray-700">
                Total:
              </div>
              <div className="text-base md:text-lg lg:text-xl xl:text-5xl font-bold text-primary-600">
                ₲{products.reduce((total, product) => {
                  const quantity = productQuantities[product.cod_barra] || 1;
                  return total + (product.precio * quantity);
                }, 0).toLocaleString('es-PY')}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-6 flex-shrink-0">
          <button
            onClick={handleAgregar}
            disabled={products.length === 0}
            className="w-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 md:py-4 lg:py-5 xl:py-11 rounded-lg text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold transition-colors duration-200"
          >
            Agregar
          </button>

          <button
            onClick={handleVolver}
            className="w-full bg-gray-300 text-gray-800 py-3 md:py-4 lg:py-5 xl:py-11 rounded-lg text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold transition-colors duration-200"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
