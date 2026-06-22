import { useState, useEffect } from "react";
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import { barcodeService } from "../../../services/BarcodeService";
import HttpClient from "../../../utils/httpClient";
import { ApiError } from "../../../utils/ApiError";
import { useLoading } from "../../common/LoadingContext";
import { useLanguage } from "../../common/LanguageContext";
import { ARCHI_ENDPOINTS } from "../../../config/endpoints/archi";

const FLAG_ICON_CLASSNAME = "w-3.5 md:w-4 lg:w-5 xl:w-7 h-auto rounded-sm flex-shrink-0";

function SpainFlagIcon() {
  return (
    <svg viewBox="0 0 20 14" className={FLAG_ICON_CLASSNAME}>
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  );
}

function UsaFlagIcon() {
  const stripeHeight = 14 / 13;
  return (
    <svg viewBox="0 0 20 14" className={FLAG_ICON_CLASSNAME}>
      <rect width="20" height="14" fill="#FFFFFF" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 2 * stripeHeight} width="20" height={stripeHeight} fill="#B22234" />
      ))}
      <rect width="8" height={7 * stripeHeight} fill="#3C3B6E" />
    </svg>
  );
}

interface ConsultaProduct {
  codigo: string;
  descripcion: string;
  precio: number;
  codigo_barra: string;
  descripcion_corta: string;
  nivel3: number;
  pesable: number;
  foto: string;
}

interface MainMenuPageProps {
  onIniciarCompra?: () => void;
  onSalir?: () => void;
}

export default function MainMenuPage({
  onIniciarCompra,
  onSalir,
}: MainMenuPageProps) {
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDoorModal, setShowDoorModal] = useState(false);
  const [product, setProduct] = useState<ConsultaProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { showLoading, hideLoading } = useLoading();
  const { language, setLanguage, t } = useLanguage();

  // Estados de conexión (se verifican bajo demanda)
  const [isScaleConnected, setIsScaleConnected] = useState(true);

  // Verificar conexión con la balanza (intento de WebSocket con timeout)
  const checkScaleConnection = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const scaleUrl =
        import.meta.env.VITE_SOCKET_VALIDATION_SCALE_URL || "ws://localhost:3001";

      const socket = new WebSocket(scaleUrl);
      const timeout = setTimeout(() => {
        socket.close();
        resolve(false);
      }, 3000);

      socket.onopen = () => {
        clearTimeout(timeout);
        socket.close();
        resolve(true);
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        socket.close();
        resolve(false);
      };
    });
  };

  // Verificar balanza y proceder con la compra
  const checkDevicesAndStartPurchase = async (barcode?: string) => {
    showLoading();

    // Verificar balanza
    const scaleOk = await checkScaleConnection();
    setIsScaleConnected(scaleOk);
    if (!scaleOk) {
      console.error("❌ MainMenu: Balanza no disponible");
      hideLoading();
      return;
    }

    hideLoading();

    // Balanza conectada, proceder con la compra
    if (barcode) {
      sessionStorage.setItem("pendingBarcode", barcode);
    }
    if (onIniciarCompra) onIniciarCompra();
  };

  // Escucha de escaneo en el menú principal (sin modal abierto)
  useEffect(() => {
    if (showPriceModal) return;

    const handleBarcodeMain = (barcode: string) => {
      // Verificar dispositivos y proceder si están conectados
      checkDevicesAndStartPurchase(barcode);
    };

    barcodeService.setOnBarcodeScanned(handleBarcodeMain);
    barcodeService.startListening();

    return () => {
      barcodeService.stopListening();
    };
  }, [showPriceModal, onIniciarCompra]);

  // Escucha de escaneo dentro del modal de consulta de precio
  useEffect(() => {
    if (!showPriceModal) return;

    const handleBarcode = async (barcode: string) => {
      try {
        showLoading();
        setErrorMessage("");
        const response = await HttpClient.get<ConsultaProduct>(
          ARCHI_ENDPOINTS.consultaProducto(barcode),
        );
        setProduct(response);
      } catch (error) {
        console.error("Error al consultar producto:", error);
        setProduct(null);
        if (error instanceof ApiError) {
          setErrorMessage(error.getUserFriendlyMessage());
        } else {
          setErrorMessage(t("mainMenu.unexpectedError"));
        }
      } finally {
        hideLoading();
      }
    };

    barcodeService.setOnBarcodeScanned(handleBarcode);
    barcodeService.startListening();

    return () => {
      barcodeService.stopListening();
    };
  }, [showPriceModal]);

  const handleOpenPriceModal = () => {
    setProduct(null);
    setErrorMessage("");
    setShowPriceModal(true);
  };

  const handleClosePriceModal = () => {
    setShowPriceModal(false);
    setProduct(null);
    setErrorMessage("");
  };

  const handleAbrirPuerta = async () => {
    try {
      showLoading();
      await HttpClient.put(ARCHI_ENDPOINTS.abrirPuerta, {});
      setShowDoorModal(true);
      setTimeout(() => setShowDoorModal(false), 4000);
    } catch (error) {
      console.error("❌ Error al abrir la puerta:", error);
    } finally {
      hideLoading();
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    const barcode = product.codigo_barra;
    setShowPriceModal(false);
    setProduct(null);
    // Verificar dispositivos y proceder con el código de barras del producto consultado
    await checkDevicesAndStartPurchase(barcode);
  };

  return (
    <div className="h-screen bg-secondary-100 flex items-center justify-center p-2 md:p-3 lg:p-4 xl:p-8 overflow-hidden">
      {/* Selector de idioma */}
      <div className="fixed top-2 md:top-3 lg:top-4 xl:top-8 right-2 md:right-3 lg:right-4 xl:right-8 flex gap-1 md:gap-2 bg-white rounded-full shadow-lg p-1 z-50">
        <button
          onClick={() => setLanguage("es")}
          className={`flex items-center gap-1 md:gap-1.5 px-3 md:px-4 lg:px-5 xl:px-8 py-1 md:py-1.5 lg:py-2 xl:py-3 rounded-full text-xs md:text-sm lg:text-base xl:text-xl font-bold transition-colors duration-200 ${
            language === "es"
              ? "bg-primary-600 text-white"
              : "text-gray-500"
          }`}
        >
          <SpainFlagIcon />
          ES
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`flex items-center gap-1 md:gap-1.5 px-3 md:px-4 lg:px-5 xl:px-8 py-1 md:py-1.5 lg:py-2 xl:py-3 rounded-full text-xs md:text-sm lg:text-base xl:text-xl font-bold transition-colors duration-200 ${
            language === "en"
              ? "bg-primary-600 text-white"
              : "text-gray-500"
          }`}
        >
          <UsaFlagIcon />
          EN
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 md:gap-6 lg:gap-8 xl:gap-16 w-full max-w-3xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl">
        {/* Logo */}
        <div className="w-full flex justify-center mb-2 md:mb-3 lg:mb-4 xl:mb-10">
          <img
            src={archiLogo}
            alt="Archi Logo"
            className="max-w-[280px] md:max-w-sm lg:max-w-2xl xl:max-w-5xl w-full h-auto object-contain animate-heartbeat"
          />
        </div>

        {/* Banner de error de conexión */}
        {!isScaleConnected && (
          <div className="w-full flex flex-col gap-2 md:gap-3">
            <div className="w-full bg-red-100 border-2 border-red-400 text-red-700 px-3 md:px-4 lg:px-5 xl:px-8 py-2 md:py-3 lg:py-4 xl:py-6 rounded-lg xl:rounded-xl text-center">
              <p className="text-sm md:text-base lg:text-lg xl:text-3xl font-bold">
                {t("mainMenu.scaleDisconnectedTitle")}
              </p>
              <p className="text-xs md:text-sm lg:text-base xl:text-xl mt-1">
                {t("mainMenu.scaleDisconnectedSubtitle")}
              </p>
            </div>
          </div>
        )}

        {/* Botones superiores - Iniciar Compra y Consulta Precio */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 xl:gap-10 w-full">
          <button
            onClick={() => checkDevicesAndStartPurchase()}
            className="bg-primary-600 text-white font-bold py-4 md:py-6 lg:py-8 xl:py-16 px-4 md:px-5 lg:px-6 xl:px-12 rounded-lg lg:rounded-xl xl:rounded-2xl shadow-2xl transition-colors duration-200 text-base md:text-xl lg:text-2xl xl:text-5xl"
          >
            {t("mainMenu.startPurchase")}
          </button>

          <button
            onClick={handleOpenPriceModal}
            className="bg-primary-600 text-white font-bold py-4 md:py-6 lg:py-8 xl:py-16 px-4 md:px-5 lg:px-6 xl:px-12 rounded-lg lg:rounded-xl xl:rounded-2xl shadow-2xl transition-colors duration-200 text-base md:text-xl lg:text-2xl xl:text-5xl"
          >
            {t("mainMenu.checkPrice")}
          </button>
        </div>

        {/* Botón inferior - Salir */}
        <button
          onClick={handleAbrirPuerta}
          className="bg-primary-600 text-white font-bold py-4 md:py-6 lg:py-8 xl:py-16 px-4 md:px-5 lg:px-6 xl:px-12 rounded-lg lg:rounded-xl xl:rounded-2xl shadow-2xl transition-colors duration-200 text-base md:text-xl lg:text-2xl xl:text-5xl w-full"
        >
          {t("mainMenu.openDoor")}
        </button>
      </div>

      {/* Modal de Consulta de Precio */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-2 md:p-3 lg:p-4">
          <div className="bg-white rounded-xl lg:rounded-2xl xl:rounded-3xl p-3 md:p-4 lg:p-6 xl:p-10 w-full max-w-sm md:max-w-md lg:max-w-xl xl:max-w-3xl shadow-2xl relative overflow-hidden">
            {/* Logo de fondo */}
            <img
              src={archiLogo}
              alt=""
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 max-w-xs opacity-20 pointer-events-none"
            />
            <h2 className="text-lg md:text-xl lg:text-2xl xl:text-4xl font-bold text-primary-600 mb-2 md:mb-3 lg:mb-4 xl:mb-8 text-center relative">
              {t("mainMenu.checkPrice")}
            </h2>

            <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-900 font-semibold mb-2 md:mb-3 lg:mb-4 xl:mb-8 text-center relative">
              {t("mainMenu.scanBarcodePrompt")}
            </p>

            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-2.5 lg:py-3 xl:py-4 rounded-lg xl:rounded-xl mb-2 md:mb-3 lg:mb-4 xl:mb-6 text-sm md:text-base lg:text-lg xl:text-2xl text-center">
                {errorMessage}
              </div>
            )}

            {product && (
              <div className="border-2 border-primary-200 rounded-lg lg:rounded-xl xl:rounded-2xl p-2 md:p-3 lg:p-4 xl:p-8 mb-2 md:mb-3 lg:mb-4 xl:mb-8">
                {product.foto && (
                  <div className="flex justify-center mb-2 md:mb-3 lg:mb-4 xl:mb-6">
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${product.foto}`}
                      alt={product.descripcion}
                      className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-48 xl:h-48 object-contain rounded-lg xl:rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <h3 className="text-base md:text-lg lg:text-xl xl:text-3xl font-bold text-gray-800 mb-1 md:mb-2 lg:mb-3 xl:mb-4">
                  {product.descripcion}
                </h3>
                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-500 mb-1">
                  {t("mainMenu.codeLabel", { code: product.codigo_barra })}
                </p>
                <p className="text-xl md:text-2xl lg:text-3xl xl:text-5xl font-bold text-primary-600 mt-1 md:mt-2 lg:mt-3 xl:mt-4">
                  Gs. {product.precio.toLocaleString("es-PY")}
                </p>

                <button
                  onClick={handleAddToCart}
                  className="mt-2 md:mt-3 lg:mt-4 xl:mt-6 w-full bg-primary-600 text-white font-bold py-2 md:py-2.5 lg:py-3 xl:py-4 px-4 md:px-5 lg:px-6 xl:px-8 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-lg xl:text-2xl flex items-center justify-center gap-2 md:gap-3 lg:gap-3 xl:gap-4 transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 xl:h-8 xl:w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                    />
                  </svg>
                  {t("common.agregar")}
                </button>
              </div>
            )}

            {/* Botón Cerrar */}
            <button
              onClick={handleClosePriceModal}
              className="mt-2 md:mt-3 lg:mt-4 xl:mt-8 w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 md:py-2.5 lg:py-3 xl:py-4 px-4 md:px-5 lg:px-6 xl:px-8 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-lg xl:text-2xl transition-colors duration-200 relative"
            >
              {t("common.cerrar")}
            </button>
          </div>
        </div>
      )}
      {/* Modal Puerta Abierta */}
      {showDoorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-6 xl:p-12 w-full max-w-sm xl:max-w-xl shadow-2xl flex flex-col items-center gap-4 xl:gap-8">
            <div className="bg-green-100 rounded-full p-4 xl:p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 xl:h-20 xl:w-20 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl xl:text-4xl font-bold text-gray-800 text-center">
              {t("mainMenu.doorOpened")}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
