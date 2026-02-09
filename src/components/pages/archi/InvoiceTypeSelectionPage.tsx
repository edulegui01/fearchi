import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import OnScreenKeyboard from "../../components/OnScreenKeyboard";
import HttpClient from "../../../utils/httpClient";
import { ApiError } from "../../../utils/ApiError";
import { useLoading } from "../../common/LoadingContext";
import { useAlert } from "../../common/AlertContext";
import type { VentasAut } from "../../../types";

interface InvoiceTypeSelectionPageProps {
  onBack?: () => void;
}

type ActiveField = "ruc" | "razonSocial" | null;

// Función para calcular el dígito verificador del RUC paraguayo
function calculateRucDV(rucBase: string): string {
  // Remover cualquier caracter que no sea número
  const numericRuc = rucBase.replace(/\D/g, "");

  if (numericRuc.length === 0) {
    return "";
  }

  let suma = 0;
  let peso = 2;

  // Recorrer el RUC de derecha a izquierda con pesos incrementales (2, 3, 4, 5, ...)
  for (let i = numericRuc.length - 1; i >= 0; i--) {
    const digito = parseInt(numericRuc[i], 10);
    suma += digito * peso;
    peso++;
  }

  const resto = suma % 11;
  const dv = 11 - resto;

  // Si DV es 10 u 11, se convierte en 0
  if (dv >= 10) {
    return "0";
  }

  return dv.toString();
}

export default function InvoiceTypeSelectionPage({
  onBack,
}: InvoiceTypeSelectionPageProps) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showRazonSocialModal, setShowRazonSocialModal] = useState(false);
  const [ruc, setRuc] = useState("");
  const [dv, setDv] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("ruc");
  const [pendingClientData, setPendingClientData] = useState<VentasAut | null>(null);
  const [pendingFullRuc, setPendingFullRuc] = useState("");
  const [pendingCaja, setPendingCaja] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { showLoading, hideLoading } = useLoading();
  const { showAlert } = useAlert();
  const [cajaValue, setCajaValue] = useState<number | null>(null);

  // Obtener caja al montar el componente
  useEffect(() => {
    const fetchCaja = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await HttpClient.get<{ caja: number }>(
          `${baseUrl}/caja-config/caja`
        );
        setCajaValue(response.caja);
      } catch (error) {
        console.error("Error al obtener configuración de caja:", error);
      }
    };
    fetchCaja();
  }, []);

  // Calcular automáticamente el DV cuando cambia el RUC
  useEffect(() => {
    if (ruc) {
      const calculatedDv = calculateRucDV(ruc);
      setDv(calculatedDv);
    } else {
      setDv("");
    }
  }, [ruc]);

  const handleSinNombre = async () => {
    console.time("Sin Nombre → SaleScreen");
    console.log("Seleccionado: Sin Nombre");

    let razonSocial = "Sin Nombre";
    let documento = "0";

    try {
      setErrorMessage("");
      showLoading();
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const caja = cajaValue;

      if (caja === null) {
        setErrorMessage("No se pudo obtener la configuración de caja.");
        hideLoading();
        return;
      }

      // 1. Buscar datos del cliente
      const clientResponse = await HttpClient.post<{ nombre_cliente: string; documento: string }>(
        `${baseUrl}/pos/ventas-aut/find-client-details`,
        {
          caja,
          operacion: 4,
          documento: "44444401-7",
        }
      );

      // 3. Crear factura con el documento del cliente
      const invoiceResponse = await HttpClient.post<VentasAut>(
        `${baseUrl}/pos/ventas-aut/create-invoice`,
        {
          caja,
          operacion: 6,
          documento: clientResponse.documento,
        }
      );

      razonSocial = invoiceResponse.nombre_cliente;
      documento = invoiceResponse.documento;
    } catch (error) {
      console.error("Error al buscar datos del cliente sin nombre:", error);
      if (error instanceof ApiError && error.status === 400) {
        setErrorMessage(error.message || "Error al buscar datos del cliente.");
      } else {
        setErrorMessage("Error de conexión. Intente nuevamente.");
      }
      hideLoading();
      return;
    }

    // Guardar datos para factura sin nombre
    const invoiceData = {
      invoiceType: "sin_nombre",
      razonSocial,
      ruc: documento,
      facturaNro: invoiceResponse.ticket,
    };

    sessionStorage.setItem("invoiceData", JSON.stringify(invoiceData));

    // Verificar si hay productos desde la consulta de precios
    const priceCheckData = sessionStorage.getItem("priceCheckProducts");
    let navigationState = invoiceData;

    if (priceCheckData) {
      const { products, productQuantities } = JSON.parse(priceCheckData);
      console.log("📦 Cargando productos desde consulta de precios:", products);

      navigationState = {
        ...invoiceData,
        products,
        productQuantities,
        fromPriceCheck: true,
      };

      // Limpiar productos de consulta después de usarlos
      sessionStorage.removeItem("priceCheckProducts");
    }

    // Navegar a la página de selección de bolsa
    console.timeEnd("Sin Nombre → SaleScreen");
    hideLoading();
    navigate("/bag-selection", {
      state: navigationState,
    });
  };

  const handleConNombre = () => {
    console.log("Seleccionado: Con Nombre");
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que el RUC no esté vacío
    if (!ruc.trim()) {
      showAlert("Por favor, ingrese el RUC", "warning");
      return;
    }

    // Concatenar RUC con DV (formato: RUC-DV)
    const fullRuc = `${ruc.trim()}-${dv}`;

    try {
      showLoading();
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const caja = cajaValue;

      if (caja === null) {
        showAlert("No se pudo obtener la configuración de caja.");
        hideLoading();
        return;
      }

      // Hacer petición POST para buscar datos del cliente
      const response = await HttpClient.post<VentasAut>(
        `${baseUrl}/pos/ventas-aut/find-client-details`,
        {
          caja,
          operacion: 4,
          documento: fullRuc,
        }
      );

      console.log("Respuesta del servidor:", response);

      // Verificar estado de la respuesta
      if (response.estado === 1) {
        // Estado 1: Crear factura directamente
        await createInvoice(caja, fullRuc, response.nombre_cliente, response);
      } else {
        // Estado diferente de 1: Mostrar modal para ingresar razón social
        setPendingClientData(response);
        setPendingFullRuc(fullRuc);
        setPendingCaja(caja);
        setShowModal(false);
        setShowRazonSocialModal(true);
        setActiveField("razonSocial");
        hideLoading();
      }
    } catch (error) {
      console.error("Error al buscar datos del cliente:", error);
      if (error instanceof ApiError && error.status === 404) {
        // Cliente no encontrado: mostrar modal para ingresar razón social
        setPendingFullRuc(fullRuc);
        setPendingCaja(String(cajaValue));
        setShowModal(false);
        setShowRazonSocialModal(true);
        setActiveField("razonSocial");
      } else {
        showAlert("Error al buscar datos del cliente. Por favor, intente nuevamente.");
      }
      hideLoading();
    }
  };

  const createInvoice = async (
    caja: string,
    fullRuc: string,
    nombreCliente: string,
    clientData: VentasAut
  ) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // Hacer petición POST para crear la factura
      const invoiceResponse = await HttpClient.post<VentasAut>(`${baseUrl}/pos/ventas-aut/create-invoice`, {
        caja,
        operacion: 6,
        documento: fullRuc,
      });

      // Guardar datos para factura con nombre
      const invoiceData = {
        invoiceType: "con_nombre",
        razonSocial: nombreCliente || "",
        ruc: fullRuc,
        clientData: clientData,
        facturaNro: invoiceResponse.ticket,
      };

      sessionStorage.setItem("invoiceData", JSON.stringify(invoiceData));

      // Verificar si hay productos desde la consulta de precios
      const priceCheckData = sessionStorage.getItem("priceCheckProducts");
      let navigationState = invoiceData;

      if (priceCheckData) {
        const { products, productQuantities } = JSON.parse(priceCheckData);
        console.log(
          "📦 Cargando productos desde consulta de precios:",
          products
        );

        navigationState = {
          ...invoiceData,
          products,
          productQuantities,
          fromPriceCheck: true,
        };

        // Limpiar productos de consulta después de usarlos
        sessionStorage.removeItem("priceCheckProducts");
      }

      // Navegar a la página de selección de bolsa
      hideLoading();
      navigate("/bag-selection", {
        state: navigationState,
      });
    } catch (error) {
      console.error("Error al crear factura:", error);
      showAlert("Error al crear factura. Por favor, intente nuevamente.");
      hideLoading();
    }
  };

  const handleRazonSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!razonSocial.trim()) {
      showAlert("Por favor, ingrese la razón social", "warning");
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // Hacer POST para registrar el cliente
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/register-client`, {
        caja: pendingCaja,
        operacion: 5,
        documento: pendingFullRuc,
        nombre: razonSocial.trim(),
      });

      // Crear factura con el cliente registrado
      const invoiceResponse = await HttpClient.post<VentasAut>(
        `${baseUrl}/pos/ventas-aut/create-invoice`,
        {
          caja: Number(pendingCaja),
          operacion: 6,
          documento: pendingFullRuc,
        }
      );

      // Guardar datos para factura con nombre
      const invoiceData = {
        invoiceType: "con_nombre",
        razonSocial: invoiceResponse.nombre_cliente || razonSocial.trim(),
        ruc: invoiceResponse.documento || pendingFullRuc,
        clientData: invoiceResponse,
        facturaNro: invoiceResponse.ticket,
      };

      sessionStorage.setItem("invoiceData", JSON.stringify(invoiceData));

      // Verificar si hay productos desde la consulta de precios
      const priceCheckData = sessionStorage.getItem("priceCheckProducts");
      let navigationState = invoiceData;

      if (priceCheckData) {
        const { products, productQuantities } = JSON.parse(priceCheckData);
        console.log(
          "📦 Cargando productos desde consulta de precios:",
          products
        );

        navigationState = {
          ...invoiceData,
          products,
          productQuantities,
          fromPriceCheck: true,
        };

        sessionStorage.removeItem("priceCheckProducts");
      }

      navigate("/bag-selection", {
        state: navigationState,
      });
    } catch (error) {
      console.error("Error al registrar cliente:", error);
      showAlert("Error al registrar cliente. Por favor, intente nuevamente.");
    }
  };

  const handleCloseRazonSocialModal = () => {
    setShowRazonSocialModal(false);
    setRazonSocial("");
    setPendingClientData(null);
    setPendingFullRuc("");
    setPendingCaja("");
    setActiveField("ruc");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setRuc("");
    setDv("");
    setActiveField("ruc");
  };

  const handleKeyPress = (key: string) => {
    if (activeField === "ruc") {
      setRuc((prev) => prev + key);
    } else if (activeField === "razonSocial") {
      setRazonSocial((prev) => prev + key);
    }
  };

  const handleBackspace = () => {
    if (activeField === "ruc") {
      setRuc((prev) => prev.slice(0, -1));
    } else if (activeField === "razonSocial") {
      setRazonSocial((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (activeField === "ruc") {
      setRuc("");
    } else if (activeField === "razonSocial") {
      setRazonSocial("");
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
          ¿Cómo preferís tu factura?
        </h1>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 md:px-4 lg:px-5 xl:px-6 py-2 md:py-2.5 lg:py-3 xl:py-4 rounded-lg xl:rounded-xl mb-2 md:mb-3 lg:mb-4 xl:mb-6 text-sm md:text-base lg:text-lg xl:text-2xl text-center w-full">
            {errorMessage}
          </div>
        )}

        {/* Opciones de factura */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 xl:gap-12 w-full">
          {/* Opción Sin Nombre */}
          <button
            onClick={handleSinNombre}
            className="bg-primary-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de usuario genérico */}
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600">
              Sin Nombre
            </span>
          </button>

          {/* Opción Con Nombre */}
          <button
            onClick={handleConNombre}
            className="bg-primary-50 border-2 xl:border-4 border-primary-600 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl transition-all duration-200 p-3 md:p-4 lg:p-6 xl:p-12 flex flex-col items-center justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 min-h-[140px] md:min-h-[180px] lg:min-h-[220px] xl:min-h-[400px] active:scale-95"
          >
            {/* Icono de documento/ID */}
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
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            </div>
            <span className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600">
              Con Nombre
            </span>
          </button>
        </div>

        {/* Botón Volver (opcional) */}
        <button
          onClick={() => navigate("/menu")}
          className="mt-2 md:mt-3 lg:mt-4 xl:mt-8 w-full bg-gray-300 text-gray-800 font-bold py-2 md:py-3 lg:py-4 xl:py-6 px-6 md:px-8 lg:px-10 xl:px-16 rounded-lg xl:rounded-xl shadow-lg transition-colors duration-200 text-base md:text-lg lg:text-xl xl:text-3xl"
        >
          Volver
        </button>
      </div>

      {/* Modal de formulario para Con Nombre */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-3 lg:p-4 xl:p-8 overflow-y-auto">
          <div className="bg-white rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-3 md:p-4 lg:p-6 xl:p-12 max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl w-full my-2 md:my-3 lg:my-4 xl:my-8">
            <h2 className="text-lg md:text-xl lg:text-3xl xl:text-5xl font-bold text-primary-600 mb-2 md:mb-3 lg:mb-4 xl:mb-8 text-center">
              Datos de Facturación
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-2 md:space-y-3 lg:space-y-4 xl:space-y-8">
              {/* Campo RUC */}
              <div>
                <label
                  htmlFor="ruc"
                  className="block text-sm md:text-base lg:text-xl xl:text-3xl font-semibold text-gray-700 mb-1 md:mb-2 lg:mb-3"
                >
                  RUC
                </label>
                <div className="flex gap-1 md:gap-2 lg:gap-3 items-center">
                  {/* Input RUC base */}
                  <input
                    type="text"
                    id="ruc"
                    value={ruc}
                    readOnly
                    onFocus={() => setActiveField("ruc")}
                    onClick={() => setActiveField("ruc")}
                    className={`flex-1 px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-2.5 lg:py-3 xl:py-5 text-sm md:text-base lg:text-xl xl:text-3xl border-2 xl:border-4 rounded-lg xl:rounded-xl focus:outline-none transition-colors cursor-pointer ${
                      activeField === "ruc"
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-300 bg-white"
                    }`}
                    placeholder="Ingrese el RUC"
                  />

                  {/* Separador */}
                  <span className="text-base md:text-lg lg:text-2xl xl:text-4xl font-bold text-gray-600">-</span>

                  {/* Input DV (calculado automáticamente) */}
                  <input
                    type="text"
                    id="dv"
                    value={dv}
                    readOnly
                    className="w-10 md:w-12 lg:w-14 xl:w-20 px-2 md:px-2.5 lg:px-3 xl:px-4 py-2 md:py-2.5 lg:py-3 xl:py-5 text-sm md:text-base lg:text-xl xl:text-3xl border-2 xl:border-4 border-gray-300 bg-gray-100 rounded-lg xl:rounded-xl text-center font-bold text-gray-700"
                    placeholder="0"
                    title="Dígito Verificador (calculado automáticamente)"
                  />
                </div>
                <p className="text-xs md:text-sm lg:text-sm xl:text-lg text-gray-500 mt-1 ml-1">
                  El dígito verificador se calcula automáticamente
                </p>
              </div>

              {/* Teclado en pantalla */}
              <div className="mt-2 md:mt-3 lg:mt-4 xl:mt-6">
                <OnScreenKeyboard
                  type="numbers"
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 md:gap-3 lg:gap-4 xl:gap-6 mt-3 md:mt-4 lg:mt-6 xl:mt-10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 md:py-3 lg:py-4 xl:py-6 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-xl xl:text-3xl transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white font-bold py-2 md:py-3 lg:py-4 xl:py-6 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-xl xl:text-3xl transition-colors duration-200"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Razón Social */}
      {showRazonSocialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-3 lg:p-4 xl:p-8 overflow-y-auto">
          <div className="bg-white rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-3 md:p-4 lg:p-6 xl:p-12 max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl w-full my-2 md:my-3 lg:my-4 xl:my-8">
            <h2 className="text-lg md:text-xl lg:text-3xl xl:text-5xl font-bold text-primary-600 mb-2 md:mb-3 lg:mb-4 xl:mb-8 text-center">
              Ingrese Razón Social
            </h2>

            <form onSubmit={handleRazonSocialSubmit} className="space-y-2 md:space-y-3 lg:space-y-4 xl:space-y-8">
              {/* Campo Razón Social */}
              <div>
                <label
                  htmlFor="razonSocial"
                  className="block text-sm md:text-base lg:text-xl xl:text-3xl font-semibold text-gray-700 mb-1 md:mb-2 lg:mb-3"
                >
                  Razón Social
                </label>
                <input
                  type="text"
                  id="razonSocial"
                  value={razonSocial}
                  readOnly
                  onFocus={() => setActiveField("razonSocial")}
                  onClick={() => setActiveField("razonSocial")}
                  className={`w-full px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-2.5 lg:py-3 xl:py-5 text-sm md:text-base lg:text-xl xl:text-3xl border-2 xl:border-4 rounded-lg xl:rounded-xl focus:outline-none transition-colors cursor-pointer ${
                    activeField === "razonSocial"
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="Ingrese la razón social"
                />
              </div>

              {/* Mostrar RUC (solo lectura) */}
              <div>
                <label className="block text-xs md:text-sm lg:text-lg xl:text-2xl font-semibold text-gray-500 mb-1">
                  RUC
                </label>
                <p className="text-xs md:text-sm lg:text-lg xl:text-2xl text-gray-700 bg-gray-100 px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-2.5 lg:py-3 xl:py-4 rounded-lg xl:rounded-xl">
                  {pendingFullRuc}
                </p>
              </div>

              {/* Teclado en pantalla */}
              <div className="mt-2 md:mt-3 lg:mt-4 xl:mt-6">
                <OnScreenKeyboard
                  type="letters"
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 md:gap-3 lg:gap-4 xl:gap-6 mt-3 md:mt-4 lg:mt-6 xl:mt-10">
                <button
                  type="button"
                  onClick={handleCloseRazonSocialModal}
                  className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 md:py-3 lg:py-4 xl:py-6 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-xl xl:text-3xl transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white font-bold py-2 md:py-3 lg:py-4 xl:py-6 rounded-lg xl:rounded-xl text-sm md:text-base lg:text-xl xl:text-3xl transition-colors duration-200"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
