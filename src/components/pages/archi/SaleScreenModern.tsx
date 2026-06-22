import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import archiLogo from '../../../assets/archi_logo_al_paso.png';
import ProductItemModern from '../../components/ProductItemModern';
import { barcodeService } from '../../../services/BarcodeService';
import ProductService from '../../../services/product/ProductService';
import { ApiError } from '../../../utils/ApiError';
import type { Product, ApiProduct, ProductQuantities, LocationState, UserProps, ScannedProduct } from '../../../types';
import { useLanguage } from "../../common/LanguageContext";

export default function SaleScreenModern({ userName: propUserName = "Usuario", cedula: _cedula = "" }: UserProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>({});
  const [isActive, setIsActive] = useState(true);

  const getInvoiceData = () => {
    const invoiceData = sessionStorage.getItem('invoiceData');
    if (invoiceData) {
      return JSON.parse(invoiceData);
    }
    return locationState || { razonSocial: 'Sin Nombre', ruc: '0' };
  };

  const invoiceData = getInvoiceData();
  const userName = invoiceData.razonSocial || propUserName;

  useEffect(() => {
    console.log('🔄 SaleScreenModern montado - Cargando productos...');

    if (locationState?.fromBarcodeScan && locationState?.scannedProduct) {
      console.log('📦 Producto recibido desde WelcomeScreen:', locationState.scannedProduct);
      handleProductFromWelcome(locationState.scannedProduct);
    }

    if (locationState?.fromPriceCheck && locationState?.products) {
      console.log('📦 Productos recibidos desde consulta de precios:', locationState.products);
      setProducts(locationState.products);
      setProductQuantities(locationState.productQuantities || {});
      return;
    }

    const sessionData = sessionStorage.getItem('currentOrder');
    let orderData = null;

    if (sessionData) {
      orderData = JSON.parse(sessionData);
    } else if (locationState && locationState.products) {
      orderData = locationState;
    }

    if (orderData && orderData.products) {
      setProducts(orderData.products);
      const initialQuantities: ProductQuantities = {};
      orderData.products.forEach((product: Product) => {
        initialQuantities[product.cod_barra] = 1;
      });
      setProductQuantities(initialQuantities);
    }
  }, [locationState]);

  useEffect(() => {
    console.log('✅ SaleScreenModern: Activando escucha de códigos de barras...');
    setIsActive(true);
    barcodeService.setOnBarcodeScanned(handleBarcodeScanned);
    barcodeService.startListening();

    return () => {
      console.log('🛑 SaleScreenModern: Desactivando escucha de códigos de barras...');
      setIsActive(false);
      barcodeService.stopListening();
      barcodeService.setOnBarcodeScanned(() => {});
    };
  }, []);

  const handleProductFromWelcome = (apiProduct: ApiProduct) => {
    try {
      const mappedProduct: Product = {
        cod_barra: apiProduct.barcode || apiProduct.id?.toString() || '',
        descripcion: apiProduct.description || apiProduct.name || '',
        category_id: 0,
        name: apiProduct.name || '',
        sku: apiProduct.id?.toString() || '',
        imagen: '',
        precio: apiProduct.price || 0,
        peso: 0,
        es_pesable: false,
        purchase_price: 0,
        tax: 0,
        stock: apiProduct.stock || 0,
        stock_min: 0,
        active: apiProduct.status === 'active'
      };

      const existingProduct = products.find(p => p.cod_barra === mappedProduct.cod_barra);
      if (existingProduct) {
        setProductQuantities(prev => ({
          ...prev,
          [mappedProduct.cod_barra]: (prev[mappedProduct.cod_barra] || 1) + 1
        }));
      } else {
        setProducts(prev => [...prev, mappedProduct]);
        setProductQuantities(prev => ({ ...prev, [mappedProduct.cod_barra]: 1 }));
      }
    } catch (error) {
      console.error('💥 Error al procesar producto:', error);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (!isActive) return;

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
          peso: parseFloat(product.peso) || 0,
          es_pesable: product.es_pesable,
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
        } else {
          setProducts(prev => [...prev, mappedProduct]);
          setProductQuantities(prev => ({ ...prev, [mappedProduct.cod_barra]: 1 }));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        alert(error.response?.message || t("saleScreen.productNotFound"));
      } else {
        alert(t("priceCheck.searchError"));
      }
    }
  };

  const handlePagar = () => {
    const totalAmount = products.reduce((total, product) => {
      return total + (product.precio * (productQuantities[product.cod_barra] || 1));
    }, 0);

    navigate('/payment', {
      state: { products, totalAmount, ruc: invoiceData.ruc, razonSocial: invoiceData.razonSocial, productQuantities }
    });
  };

  const handleCancelar = () => {
    setProducts([]);
    setProductQuantities({});
    sessionStorage.removeItem('currentOrder');
    sessionStorage.removeItem('invoiceData');
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
    <div
      className="h-screen flex flex-col p-2 md:p-3 lg:p-4 xl:p-7 relative overflow-hidden"
      style={{
        backgroundImage: `url(${archiLogo})`,
        backgroundPosition: 'center',
        backgroundSize: '85%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: 'white'
      }}
    >
      {/* Overlay para hacer el fondo más sutil */}
      <div className="absolute inset-0 bg-white/50"></div>

      <div className="w-full flex flex-col h-full relative z-10">
        {/* Header minimalista */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-xl border border-primary-200 p-2 md:p-3 lg:p-4 xl:p-6 mb-1 md:mb-2 lg:mb-3 xl:mb-6 flex-shrink-0">
          <div className="text-center">
            <h1 className="text-base md:text-lg lg:text-3xl xl:text-6xl font-black text-primary-600">{userName}</h1>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 font-semibold text-xs md:text-sm lg:text-sm xl:text-base">{t("saleScreen.systemActive")}</span>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 min-h-0 mb-1 md:mb-2 lg:mb-3 xl:mb-6 overflow-y-auto bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-xl border border-gray-200 p-2 md:p-3 lg:p-4 xl:p-6">
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2 md:space-y-3 lg:space-y-4 xl:space-y-6">
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-40 xl:h-40 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-20 xl:h-20 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-primary-600 text-lg md:text-xl lg:text-2xl xl:text-5xl font-black">{t("saleScreen.scanProductsTitle")}</p>
                <p className="text-gray-500 text-sm md:text-base lg:text-lg xl:text-2xl">{t("saleScreen.scanProductsSubtitle")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 md:space-y-2 lg:space-y-2 xl:space-y-4">
              {products.map((product, index) => (
                <ProductItemModern
                  key={product.cod_barra || index}
                  product={product}
                  index={index}
                  quantity={productQuantities[product.cod_barra] || 1}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-2 md:p-3 lg:p-4 xl:p-8 mb-1 md:mb-2 lg:mb-3 xl:mb-6 flex-shrink-0">
          <div className="flex justify-between items-center text-white">
            <div>
              <div className="text-primary-100 text-[10px] md:text-xs lg:text-xs xl:text-sm font-bold uppercase">{t("saleScreen.totalToPay")}</div>
              <div className="text-lg md:text-xl lg:text-3xl xl:text-6xl font-black">
                ₲{products.reduce((total, product) => {
                  return total + (product.precio * (productQuantities[product.cod_barra] || 1));
                }, 0).toLocaleString('es-PY')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-primary-100 text-[10px] md:text-xs lg:text-xs xl:text-sm font-semibold">{t("saleScreen.items")}</div>
              <div className="text-base md:text-lg lg:text-2xl xl:text-4xl font-black">{products.length}</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 md:gap-3 lg:gap-4 xl:gap-6 flex-shrink-0">
          <button
            onClick={handlePagar}
            disabled={products.length === 0}
            className="flex-1 bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 md:py-4 lg:py-5 xl:py-12 rounded-xl lg:rounded-2xl xl:rounded-3xl text-lg md:text-xl lg:text-2xl xl:text-5xl font-black shadow-2xl transition-all duration-200 active:scale-95"
          >
            {t("saleScreen.pay")}
          </button>
          <button
            onClick={handleCancelar}
            className="flex-1 bg-gray-300 text-gray-800 py-3 md:py-4 lg:py-5 xl:py-12 rounded-xl lg:rounded-2xl xl:rounded-3xl text-lg md:text-xl lg:text-2xl xl:text-5xl font-black shadow-2xl transition-all duration-200 active:scale-95"
          >
            {t("saleScreen.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
