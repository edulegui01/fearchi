import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import HttpClient from "../../../utils/httpClient";
import { ApiError } from "../../../utils/ApiError";
import { useAlert } from "../../common/AlertContext";
import { useLoading } from "../../common/LoadingContext";

interface PaymentSelectionPageProps {
  onBack?: () => void;
}

type PaymentMethod = "tarjeta" | "qr" | null;
type PaymentStatus = "idle" | "loading" | "success" | "error";

interface PaymentResult {
  success: boolean;
  message: string;
  codigoAutorizacion?: string;
  mensajeDisplay?: string;
  nombreCliente?: string;
  nombreTarjeta?: string;
  nroBoleta?: string;
  pan?: string;
  saldo?: number;
  montoVuelto?: number;
}

interface PaymentResponse {
  codigoAutorizacion: string;
  codigoComercio: string;
  issuerId: string;
  mensajeDisplay: string;
  montoVuelto: number;
  nombreCliente: string;
  nombreTarjeta: string;
  nroBoleta: string;
  saldo: number;
  pan?: string; // Solo en tarjeta
}

export default function PaymentSelectionPage({
  onBack,
}: PaymentSelectionPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const { showLoading, hideLoading } = useLoading();

  // Modo de operación desde .env
  const useInsertProductsMode =
    import.meta.env.VITE_USE_INSERT_PRODUCTS_MODE === "true";

  // Estado del modal
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null,
  );

  // Obtener datos del state (productos, total, etc.)
  const stateData = location.state || {};
  const totalAmount = stateData.totalAmount || 0;

  console.log("💳 PaymentSelectionPage - location.state:", location.state);
  console.log("💳 PaymentSelectionPage - totalAmount:", totalAmount);

  // Obtener número de factura del sessionStorage
  const getFacturaNro = (): number => {
    const invoiceData = sessionStorage.getItem("invoiceData");
    if (invoiceData) {
      const parsed = JSON.parse(invoiceData);
      return parsed.facturaNro || 0;
    }
    return 0;
  };

  // Obtener número de caja del sessionStorage
  const getCaja = (): number => {
    const invoiceData = sessionStorage.getItem("invoiceData");
    if (invoiceData) {
      const parsed = JSON.parse(invoiceData);
      return parsed.caja || 1;
    }
    return 1;
  };

  const processPayment = async (method: PaymentMethod) => {
    if (!method) return;

    setPaymentStatus("loading");

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const endpoint =
        method === "tarjeta"
          ? "/pos/ventas-aut/pago-tarjeta"
          : "/pos/ventas-aut/pago-qr";
      const facturaNro = getFacturaNro();

      const caja = getCaja();

      const response = await HttpClient.post<PaymentResponse>(
        `${baseUrl}${endpoint}`,
        {
          caja,
          facturaNro: 1,
          monto: totalAmount,
        },
      );

      setPaymentResult({
        success: true,
        message: response.mensajeDisplay || "Pago realizado con éxito",
        codigoAutorizacion: response.codigoAutorizacion,
        mensajeDisplay: response.mensajeDisplay,
        nombreCliente: response.nombreCliente,
        nombreTarjeta: response.nombreTarjeta,
        nroBoleta: response.nroBoleta,
        pan: response.pan,
        saldo: response.saldo,
        montoVuelto: response.montoVuelto,
      });

      setPaymentStatus("success");

      // Cerrar modal después de 2 segundos y navegar
      setTimeout(() => {
        handleCloseModal();
        // Limpiar datos y navegar al menú
        sessionStorage.removeItem("currentOrder");
        sessionStorage.removeItem("invoiceData");
        sessionStorage.removeItem("paymentMethod");
        navigate("/menu");
      }, 2000);
    } catch (error) {
      console.error("Error en el pago:", error);

      let errorMessage = "Error al procesar el pago";
      if (error instanceof ApiError) {
        errorMessage = error.getUserFriendlyMessage();
      }

      setPaymentResult({
        success: false,
        message: errorMessage,
      });
      setPaymentStatus("error");

      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        handleCloseModal();
      }, 3000);
    }
  };

  const handlePagoTarjeta = () => {
    setPaymentMethod("tarjeta");
    setPaymentStatus("idle");
    setPaymentResult(null);
    setShowModal(true);

    // Iniciar proceso de pago
    setTimeout(() => {
      processPayment("tarjeta");
    }, 500);
  };

  const handlePagoQR = () => {
    setPaymentMethod("qr");
    setPaymentStatus("idle");
    setPaymentResult(null);
    setShowModal(true);

    // Iniciar proceso de pago
    setTimeout(() => {
      processPayment("qr");
    }, 500);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPaymentMethod(null);
    setPaymentStatus("idle");
    setPaymentResult(null);
  };

  // Obtener documento del cliente desde invoiceData
  const getClienteDocumento = (): string => {
    const invoiceData = sessionStorage.getItem("invoiceData");
    if (invoiceData) {
      const parsed = JSON.parse(invoiceData);
      return parsed.ruc || "44444401-7";
    }
    return "44444401-7";
  };

  // Limpiar ticket y recrear factura
  const cleanAndRecreateInvoice = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const caja = getCaja();

    try {
      // 1. Limpiar ticket
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/ticket-clean`, { caja });
      console.log("✅ Ticket limpiado");

      // 2. Recrear factura con el cliente actual
      const documento = getClienteDocumento();
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/create-invoice`, {
        caja,
        operacion: 6,
        documento,
      });
      console.log("✅ Factura recreada para:", documento);
    } catch (error) {
      console.error("❌ Error al limpiar/recrear factura:", error);
    }
  };

  const handleBack = async () => {
    // Limpiar ticket y recrear factura (solo en modo inserción)
    if (useInsertProductsMode) {
      showLoading();
      await cleanAndRecreateInvoice();
      hideLoading();
    }

    if (onBack) {
      onBack();
    } else {
      navigate("/sale");
    }
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
          ¿Cómo preferís pagar?
        </h1>

        {/* Opciones de pago */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 xl:gap-12 w-full">
          {/* Opción Pago con Tarjeta */}
          <button
            onClick={handlePagoTarjeta}
            className="bg-primary-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de tarjeta */}
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600">
              Tarjeta
            </span>
            <span className="text-xs md:text-sm lg:text-lg xl:text-2xl text-gray-500">
              Débito o Crédito
            </span>
          </button>

          {/* Opción Pago con QR */}
          <button
            onClick={handlePagoQR}
            className="bg-primary-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de QR */}
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
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600">
              Código QR
            </span>
            <span className="text-xs md:text-sm lg:text-lg xl:text-2xl text-gray-500">
              Billetera digital
            </span>
          </button>
        </div>

        {/* Botón Volver */}
        <button
          onClick={handleBack}
          className="mt-2 md:mt-3 lg:mt-4 xl:mt-8 w-full bg-gray-300 text-gray-800 font-bold py-2 md:py-3 lg:py-4 xl:py-6 px-6 md:px-8 lg:px-10 xl:px-16 rounded-lg xl:rounded-xl shadow-lg transition-colors duration-200 text-base md:text-lg lg:text-xl xl:text-3xl"
        >
          Volver
        </button>
      </div>

      {/* Modal de Pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-3 lg:p-4">
          <div className="bg-white rounded-xl lg:rounded-2xl xl:rounded-3xl p-4 md:p-5 lg:p-6 xl:p-12 w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl shadow-2xl flex flex-col items-center">
            {/* Estado: Loading */}
            {paymentStatus === "loading" && (
              <>
                {/* Imagen según método de pago */}
                {paymentMethod === "tarjeta" ? (
                  <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-48 xl:h-48 mb-3 md:mb-4 lg:mb-6 xl:mb-8 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-40 xl:w-40 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-48 xl:h-48 mb-3 md:mb-4 lg:mb-6 xl:mb-8 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-40 xl:w-40 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                  </div>
                )}

                {/* Mensaje según método de pago */}
                <h2 className="text-lg md:text-xl lg:text-2xl xl:text-4xl font-bold text-primary-600 mb-3 md:mb-4 lg:mb-5 xl:mb-6 text-center">
                  {paymentMethod === "tarjeta"
                    ? "Acerque la tarjeta al POS"
                    : "Escanee el código QR"}
                </h2>

                {/* Spinner de carga */}
                <div className="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-16 xl:h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-500 mt-3 md:mt-4 lg:mt-5 xl:mt-6">
                  Procesando pago...
                </p>
              </>
            )}

            {/* Estado: Éxito */}
            {paymentStatus === "success" && paymentResult && (
              <>
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4 lg:mb-6 xl:mb-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 xl:h-20 xl:w-20 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="text-lg md:text-xl lg:text-2xl xl:text-4xl font-bold text-green-600 mb-1 md:mb-2 lg:mb-3 xl:mb-4 text-center">
                  {paymentResult.message}
                </h2>

                {/* Detalles del pago */}
                {paymentResult.nombreTarjeta && (
                  <div className="text-center mb-1 md:mb-2 lg:mb-3 xl:mb-4">
                    <p className="text-sm md:text-base lg:text-base xl:text-xl text-gray-600">
                      {paymentResult.nombreTarjeta}
                    </p>
                    {paymentResult.nroBoleta && (
                      <p className="text-xs md:text-sm lg:text-sm xl:text-lg text-gray-500">
                        Boleta: {paymentResult.nroBoleta}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-500">
                  Gracias por su compra
                </p>
              </>
            )}

            {/* Estado: Error */}
            {paymentStatus === "error" && paymentResult && (
              <>
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 bg-red-100 rounded-full flex items-center justify-center mb-3 md:mb-4 lg:mb-6 xl:mb-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 xl:h-20 xl:w-20 text-red-600"
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

                <h2 className="text-lg md:text-xl lg:text-2xl xl:text-4xl font-bold text-red-600 mb-1 md:mb-2 lg:mb-3 xl:mb-4 text-center">
                  Error en el pago
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-700 text-center">
                  {paymentResult.message}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
