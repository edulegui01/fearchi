import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import ProductItemModern from '../../components/ProductItemModern';
import { barcodeService } from '../../../services/BarcodeService';
import ProductService from '../../../services/product/ProductService';
import { ApiError } from '../../../utils/ApiError';
import type { Product, ScannedProduct, ProductQuantities } from '../../../types';
import { useLanguage } from "../../common/LanguageContext";

interface PriceCheckPageProps {
  onBack?: () => void;
}

export default function PriceCheckPageModern({ onBack }: PriceCheckPageProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>({});
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setIsActive(true);
    barcodeService.setOnBarcodeScanned(handleBarcodeScanned);
    barcodeService.startListening();

    return () => {
      setIsActive(false);
      barcodeService.stopListening();
      barcodeService.setOnBarcodeScanned(() => {});
    };
  }, []);

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
        alert(error.response?.message || t("priceCheck.productNotFoundDefault"));
      } else {
        alert(t("priceCheck.searchError"));
      }
    }
  };

  const handleAgregar = () => {
    if (products.length === 0) {
      alert(t("priceCheck.noProductsToAdd"));
      return;
    }

    sessionStorage.setItem('priceCheckProducts', JSON.stringify({
      products,
      productQuantities
    }));

    navigate('/invoice-type-selection');
  };

  const handleVolver = () => {
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/50"></div>

      <div className="w-full flex flex-col h-full relative z-10">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-xl border border-primary-200 p-2 md:p-3 lg:p-4 xl:p-6 mb-1 md:mb-2 lg:mb-3 xl:mb-6 flex-shrink-0">
          <div className="text-center">
            <h1 className="text-base md:text-lg lg:text-3xl xl:text-6xl font-black text-primary-600">{t("priceCheck.title")}</h1>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <svg className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-gray-600 font-semibold text-xs md:text-sm lg:text-sm xl:text-base">{t("priceCheck.modeLabel")}</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-primary-600 text-lg md:text-xl lg:text-2xl xl:text-5xl font-black">{t("priceCheck.emptyTitle")}</p>
                <p className="text-gray-500 text-sm md:text-base lg:text-lg xl:text-2xl">{t("priceCheck.emptySubtitle")}</p>
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
              <div className="text-primary-100 text-[10px] md:text-xs lg:text-xs xl:text-sm font-bold uppercase">{t("priceCheck.totalConsultado")}</div>
              <div className="text-lg md:text-xl lg:text-3xl xl:text-6xl font-black">
                ₲{products.reduce((total, product) => {
                  return total + (product.precio * (productQuantities[product.cod_barra] || 1));
                }, 0).toLocaleString('es-PY')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-primary-100 text-[10px] md:text-xs lg:text-xs xl:text-sm font-semibold">{t("priceCheck.productsCountLabel")}</div>
              <div className="text-base md:text-lg lg:text-2xl xl:text-4xl font-black">{products.length}</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 md:gap-3 lg:gap-4 xl:gap-6 flex-shrink-0">
          <button
            onClick={handleAgregar}
            disabled={products.length === 0}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 md:py-4 lg:py-5 xl:py-12 rounded-xl lg:rounded-2xl xl:rounded-3xl text-lg md:text-xl lg:text-2xl xl:text-5xl font-black shadow-2xl hover:shadow-primary-600/50 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {t("common.agregar")}
          </button>
          <button
            onClick={handleVolver}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 md:py-4 lg:py-5 xl:py-12 rounded-xl lg:rounded-2xl xl:rounded-3xl text-lg md:text-xl lg:text-2xl xl:text-5xl font-black shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {t("common.volver")}
          </button>
        </div>
      </div>
    </div>
  );
}
