import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import HttpClient from "../../../utils/httpClient";
import { useLoading } from "../../common/LoadingContext";
import { ARCHI_ENDPOINTS } from "../../../config/endpoints/archi";
import { useAlert } from "../../common/AlertContext";
import { ApiError } from "../../../utils/ApiError";
import type { Product } from "../../../types";

// Código de la bolsa para el endpoint scan
const BOLSA_SCAN_CODE = "364";

// Interfaz para la respuesta del endpoint scan
interface ScanProductResponse {
  codigo_barras: string;
  descripcion: string;
  precio: number;
  total: number;
  peso_gramos?: string;
  cantidad: number;
  total_venta: number;
  imagen?: string;
}

interface LocationState {
  invoiceType?: string;
  razonSocial?: string;
  ruc?: string;
  clientData?: unknown;
  products?: Product[];
  productQuantities?: Record<string, number>;
  fromPriceCheck?: boolean;
}

export default function BagSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const { showLoading, hideLoading } = useLoading();
  const { showAlert } = useAlert();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSi = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      showLoading();

      // Hacer request al endpoint scan con el código de bolsa
      const bolsaProduct = await HttpClient.post<ScanProductResponse>(
        ARCHI_ENDPOINTS.scanProducto,
        {
          scan: BOLSA_SCAN_CODE,
          cantidad: 1,
        }
      );

      if (bolsaProduct) {
        // Construir URL completa de la imagen
        const imagenUrl = bolsaProduct.imagen
          ? `${import.meta.env.VITE_API_BASE_URL}${bolsaProduct.imagen}`
          : "";

        // Mapear el producto de la API al formato local
        const mappedBolsa: Product = {
          cod_barra: bolsaProduct.codigo_barras,
          descripcion: bolsaProduct.descripcion,
          category_id: 0,
          name: bolsaProduct.descripcion,
          sku: bolsaProduct.codigo_barras,
          imagen: imagenUrl,
          precio: bolsaProduct.precio,
          peso: parseFloat(bolsaProduct.peso_gramos || "0") || 0,
          es_pesable: false,
          purchase_price: 0,
          tax: 0,
          stock: 0,
          stock_min: 0,
          active: true,
        };

        // Obtener productos existentes del state o crear array vacío
        const existingProducts = locationState?.products || [];
        const existingQuantities = locationState?.productQuantities || {};

        // Agregar bolsa a los productos
        const updatedProducts = [...existingProducts, mappedBolsa];
        const updatedQuantities = {
          ...existingQuantities,
          [mappedBolsa.cod_barra]: 1,
        };

        // Navegar a SaleScreen con la bolsa incluida
        hideLoading();
        navigate("/sale", {
          state: {
            ...locationState,
            products: updatedProducts,
            productQuantities: updatedQuantities,
            fromBagSelection: true,
          },
        });
      } else {
        hideLoading();
        showAlert("No se encontró el producto bolsa en el sistema", "warning");
        // Navegar sin bolsa si no se encuentra
        navigateToSale();
      }
    } catch (error) {
      console.error("Error al buscar producto bolsa:", error);
      hideLoading();
      if (error instanceof ApiError) {
        showAlert(`Error al agregar bolsa: ${error.message}`, "warning");
      } else {
        showAlert("Error al agregar bolsa. Continuando sin ella.", "warning");
      }
      // Navegar sin bolsa si hay error
      navigateToSale();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNo = () => {
    navigateToSale();
  };

  const navigateToSale = () => {
    // Navegar a SaleScreen sin agregar bolsa
    navigate("/sale", {
      state: {
        ...locationState,
        fromBagSelection: true,
      },
    });
  };

  const handleVolver = () => {
    navigate("/invoice-type-selection");
  };

  return (
    <div className="h-screen bg-secondary-100 flex items-center justify-center p-2 md:p-3 lg:p-4 xl:p-8 overflow-hidden">
      <div className="flex flex-col items-center gap-3 md:gap-4 lg:gap-6 xl:gap-12 w-full max-w-3xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl">
        {/* Logo */}
        <div className="w-full flex justify-center mb-1 md:mb-2 lg:mb-4 xl:mb-6">
          <img
            src={archiLogo}
            alt="Archi Logo"
            className="max-w-[200px] md:max-w-xs lg:max-w-xl xl:max-w-4xl w-full h-auto object-contain"
          />
        </div>

        {/* Título */}
        <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-6xl font-bold text-primary-600 text-center mb-2 md:mb-3 lg:mb-4 xl:mb-8">
          ¿Querés bolsa?
        </h1>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 xl:gap-12 w-full">
          {/* Opción Sí */}
          <button
            onClick={handleSi}
            disabled={isProcessing}
            className="bg-primary-50 disabled:opacity-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de bolsa */}
            <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-40 xl:h-40 bg-primary-600 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 md:h-9 md:w-9 lg:h-12 lg:w-12 xl:h-24 xl:w-24 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600">Sí</span>
          </button>

          {/* Opción No */}
          <button
            onClick={handleNo}
            disabled={isProcessing}
            className="bg-primary-50 disabled:opacity-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de X */}
            <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-40 xl:h-40 bg-gray-500 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 md:h-9 md:w-9 lg:h-12 lg:w-12 xl:h-24 xl:w-24 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-gray-600">No</span>
          </button>
        </div>

        {/* Botón Volver */}
        <button
          onClick={handleVolver}
          disabled={isProcessing}
          className="mt-2 md:mt-3 lg:mt-4 xl:mt-8 w-full bg-gray-300 disabled:opacity-50 text-gray-800 font-bold py-2 md:py-3 lg:py-4 xl:py-6 px-6 md:px-8 lg:px-10 xl:px-16 rounded-lg xl:rounded-xl shadow-lg transition-colors duration-200 text-base md:text-lg lg:text-xl xl:text-3xl"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
