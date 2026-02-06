import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import archiLogo from "../../../assets/archi_logo_al_paso.png";
import ProductItem from "../../components/ProductItem";
import { barcodeService } from "../../../services/BarcodeService";
import ProductService from "../../../services/product/ProductService";
import HttpClient from "../../../utils/httpClient";
import { ApiError } from "../../../utils/ApiError";
import { useLoading } from "../../common/LoadingContext";
import { useAlert } from "../../common/AlertContext";
import type {
  Product,
  ApiProduct,
  ProductQuantities,
  LocationState,
  UserProps,
  ScannedProduct,
} from "../../../types";

// Tipos para validación de peso
interface ScaleData {
  raw: string;
  status: string;
  type: string;
  peso: number;
  unit: string;
  estable: boolean;
  timestamp: string;
}

type WeightValidationStatus = "idle" | "waiting" | "validating" | "success" | "error";

// Tipos para inserción de productos (nuevo modo)
interface ProductoInsert {
  cod_barra: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface InsertProductsResponse {
  success: boolean;
  total: number;
  resultados: { cod_barra: string; id: number }[];
}

interface InsertProductsError {
  statusCode: number;
  message: string;
  error: string;
  cod_barra?: string; // Presente cuando es error de producto específico
}

export default function SaleScreen({
  userName: propUserName = "Usuario",
  cedula = "",
}: UserProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const { showLoading, hideLoading } = useLoading();
  const { showAlert } = useAlert();

  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>(
    {},
  );
  const [isActive, setIsActive] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  // Estados para validación de peso
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightValidationStatus, setWeightValidationStatus] = useState<WeightValidationStatus>("idle");
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [expectedWeight, setExpectedWeight] = useState<number>(0);
  const [tolerance, setTolerance] = useState<number>(0);
  const [weightError, setWeightError] = useState<string>("");
  const scaleSocketRef = useRef<WebSocket | null>(null);
  // Refs para valores que necesitan ser accedidos en callbacks del WebSocket
  const expectedWeightRef = useRef<number>(0);
  const toleranceRef = useRef<number>(0);
  const productsRef = useRef<Product[]>([]);
  const productQuantitiesRef = useRef<ProductQuantities>({});

  // Estados para modo de inserción de productos
  const [productInsertError, setProductInsertError] = useState<string | null>(null);
  const [errorProductBarcode, setErrorProductBarcode] = useState<string | null>(null);
  const [isInsertingProducts, setIsInsertingProducts] = useState(false);

  // Modo de operación: true = usar endpoint insertar-productos, false = lógica actual
  const useInsertProductsMode = import.meta.env.VITE_USE_INSERT_PRODUCTS_MODE === "true";

  // Mantener refs sincronizadas con el estado
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    productQuantitiesRef.current = productQuantities;
  }, [productQuantities]);

  // Obtener datos de facturación desde location.state o sessionStorage
  const getInvoiceData = () => {
    const invoiceData = sessionStorage.getItem("invoiceData");
    if (invoiceData) {
      return JSON.parse(invoiceData);
    }
    return locationState || { razonSocial: "Sin Nombre", ruc: "0" };
  };

  const invoiceData = getInvoiceData();
  const userName = invoiceData.razonSocial || propUserName;

  useEffect(() => {
    console.log("🔄 SaleScreen montado - Cargando productos...");

    // Verificar si viene un producto escaneado desde WelcomeScreen
    if (locationState?.fromBarcodeScan && locationState?.scannedProduct) {
      console.log(
        "📦 Producto recibido desde WelcomeScreen:",
        locationState.scannedProduct,
      );
      handleProductFromWelcome(locationState.scannedProduct);
    }

    // Verificar si vienen productos desde la consulta de precios
    if (locationState?.fromPriceCheck && locationState?.products) {
      console.log(
        "📦 Productos recibidos desde consulta de precios:",
        locationState.products,
      );
      setProducts(locationState.products);
      setProductQuantities(locationState.productQuantities || {});
      return; // Salir temprano, no cargar de sessionStorage
    }

    // Verificar si vienen productos desde BagSelectionPage
    if (locationState?.fromBagSelection && locationState?.products) {
      console.log(
        "🛍️ Productos recibidos desde selección de bolsa:",
        locationState.products,
      );
      setProducts(locationState.products);
      setProductQuantities(locationState.productQuantities || {});
      return; // Salir temprano, no cargar de sessionStorage
    }

    // Intentar obtener datos del sessionStorage primero, luego del location.state
    const sessionData = sessionStorage.getItem("currentOrder");
    console.log("📱 SessionStorage data:", sessionData);
    let orderData = null;

    if (sessionData) {
      orderData = JSON.parse(sessionData);
      console.log("📦 Productos cargados desde sessionStorage:", orderData);
    } else if (locationState && locationState.products) {
      orderData = locationState;
      console.log(
        "📦 Productos recibidos desde location.state:",
        locationState,
      );
    } else {
      console.log(
        "⚠️ No se encontraron productos en sessionStorage ni location.state",
      );
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
  }, [locationState]);

  // useEffect para configurar el servicio de código de barras
  useEffect(() => {
    console.log(`✅ SaleScreen: Activando escucha de códigos de barras (modo: ${useInsertProductsMode ? "inserción" : "tradicional"})...`);
    setIsActive(true);

    // Pequeño delay para evitar problemas con StrictMode de React
    const timeoutId = setTimeout(() => {
      // Configurar callback para códigos de barras según el modo
      const scanHandler = useInsertProductsMode ? handleBarcodeScannedSimple : handleBarcodeScanned;
      barcodeService.setOnBarcodeScanned(scanHandler);

      // Iniciar escucha de códigos de barras
      barcodeService.startListening();
    }, 50);

    // Cleanup al desmontar - MUY IMPORTANTE para que solo funcione en esta vista
    return () => {
      console.log(
        "🛑 SaleScreen: Desactivando escucha de códigos de barras...",
      );
      clearTimeout(timeoutId);
      setIsActive(false);
      barcodeService.stopListening();
      // Desconectar balanza de validación si está conectada
      disconnectValidationScale();
    };
  }, [useInsertProductsMode]);

  // Verificar si hay un código de barras pendiente desde consulta de precios
  useEffect(() => {
    const pendingBarcode = sessionStorage.getItem("pendingBarcode");
    if (pendingBarcode) {
      sessionStorage.removeItem("pendingBarcode");
      // Delay para asegurar que el componente esté listo
      setTimeout(() => {
        handleBarcodeScanned(pendingBarcode);
      }, 100);
    }
  }, []);

  // Función para manejar producto recibido desde WelcomeScreen
  const handleProductFromWelcome = (apiProduct: ApiProduct) => {
    try {
      console.log("🎯 Procesando producto desde WelcomeScreen:", apiProduct);

      // Mapear el producto de la API al formato local
      const mappedProduct: Product = {
        cod_barra: apiProduct.barcode || apiProduct.id?.toString() || "",
        descripcion: apiProduct.description || apiProduct.name || "",
        category_id: 0,
        name: apiProduct.name || "",
        sku: apiProduct.id?.toString() || "",
        imagen: "",
        precio: apiProduct.price || 0,
        peso: 0,
        es_pesable: false,
        purchase_price: 0,
        tax: 0,
        stock: apiProduct.stock || 0,
        stock_min: 0,
        active: apiProduct.status === "active",
      };

      // Verificar si el producto ya está en la lista
      const existingProduct = products.find(
        (p) => p.cod_barra === mappedProduct.cod_barra,
      );

      if (existingProduct) {
        // Si ya existe, incrementar cantidad
        setProductQuantities((prev) => ({
          ...prev,
          [mappedProduct.cod_barra]: (prev[mappedProduct.cod_barra] || 1) + 1,
        }));
        console.log("✅ Cantidad incrementada para:", mappedProduct.name);
      } else {
        // Si no existe, agregar a la lista
        setProducts((prev) => [...prev, mappedProduct]);
        setProductQuantities((prev) => ({
          ...prev,
          [mappedProduct.cod_barra]: 1,
        }));

        console.log(
          "✅ Producto agregado desde WelcomeScreen:",
          mappedProduct.name,
        );

        // Actualizar sessionStorage
        setTimeout(() => {
          const updatedProducts = [...products, mappedProduct];
          const orderData = {
            products: updatedProducts,
            totalItems: updatedProducts.length,
            timestamp: new Date().toISOString(),
            source: "welcome_barcode",
          };
          sessionStorage.setItem("currentOrder", JSON.stringify(orderData));
          console.log("💾 SessionStorage actualizado desde WelcomeScreen");
        }, 100);
      }
    } catch (error) {
      console.error(
        "💥 Error al procesar producto desde WelcomeScreen:",
        error,
      );
    }
  };

  // Función para manejar códigos de barras escaneados
  const handleBarcodeScanned = async (barcode: string) => {
    // Verificar que estemos en SaleScreen activo antes de procesar
    if (!isActive) {
      console.log("⚠️ SaleScreen no está activo, ignorando escaneo");
      return;
    }

    console.log("✅ SaleScreen procesando código de barras:", barcode);

    try {
      showLoading();
      // Buscar producto por código de barras
      const product: ScannedProduct | null =
        await ProductService.getProductByBarcode(barcode);

      if (product) {
        // Construir URL completa de la imagen
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL || "http://192.168.4.41:3000";
        const imagenUrl = product.imagen ? `${baseUrl}${product.imagen}` : "";

        // Mapear el producto de la API al formato local
        const mappedProduct: Product = {
          cod_barra: product.codigo_barras,
          descripcion: product.descripcion,
          category_id: 0,
          name: product.descripcion,
          sku: product.codigo_barras,
          imagen: imagenUrl,
          precio: product.precio,
          peso: parseFloat(product.peso_gramos) || 0,
          es_pesable: parseFloat(product.peso_gramos) > 0,
          purchase_price: 0,
          tax: 0,
          stock: 0,
          stock_min: 0,
          active: true,
        };

        // Usar callback para acceder al estado actual de products (evita closure stale)
        setProducts((prevProducts) => {
          const existingProduct = prevProducts.find(
            (p) => p.cod_barra === mappedProduct.cod_barra,
          );

          if (existingProduct) {
            // Si ya existe, solo incrementar cantidad (no modificar products)
            console.log("✅ Cantidad incrementada para:", mappedProduct.name);
            return prevProducts;
          } else {
            // Si no existe, agregar a la lista
            console.log("✅ Producto agregado:", mappedProduct.name);
            const updatedProducts = [...prevProducts, mappedProduct];

            // Actualizar sessionStorage
            const orderData = {
              products: updatedProducts,
              totalItems: updatedProducts.length,
              timestamp: new Date().toISOString(),
              source: "barcode",
            };
            sessionStorage.setItem("currentOrder", JSON.stringify(orderData));

            return updatedProducts;
          }
        });

        // Siempre incrementar la cantidad (funciona para nuevo y existente)
        setProductQuantities((prev) => ({
          ...prev,
          [mappedProduct.cod_barra]: (prev[mappedProduct.cod_barra] || 0) + 1,
        }));
      }
      hideLoading();
    } catch (error) {
      hideLoading();
      // Manejar errores de la API
      if (error instanceof ApiError) {
        // Error de red o timeout - mostrar mensaje específico
        if (error.isNetworkError || error.isTimeoutError) {
          console.error("🔌 Error de conexión:", error);
          showAlert(error.getUserFriendlyMessage());
        } else if (error.status === 404) {
          // Error 404 - Producto no encontrado
          const errorMsg =
            error.response?.message ||
            `Producto con código "${barcode}" no encontrado en el sistema POS`;
          console.warn("❌ Producto no encontrado:", errorMsg);
          showAlert(errorMsg);
        } else {
          // Otros errores de API (500, 503, etc.)
          console.error("💥 Error de API:", error);
          showAlert(`Error al buscar el producto: ${error.getUserFriendlyMessage()}`);
        }
      } else {
        // Errores no relacionados con la API
        console.error("💥 Error inesperado:", error);
        showAlert("Error inesperado al buscar el producto. Por favor intente nuevamente.");
      }
    }
  };

  // Tipo para respuesta de consulta de producto
  interface ProductoConsultaResponse {
    codigo: string;
    codigo_barra: string;
    descripcion: string;
    descripcion_corta: string;
    precio: number;
    peso_gramos?: string;
    pesable?: number; // 0 o 1
    foto?: string;
    nivel3?: number;
  }

  // Función para escaneo con consulta (consulta endpoint y agrega a la lista)
  const handleBarcodeScannedSimple = async (barcode: string) => {
    if (!isActive) {
      console.log("⚠️ SaleScreen no está activo, ignorando escaneo");
      return;
    }

    console.log("✅ SaleScreen (modo inserción) procesando código de barras:", barcode);

    // Limpiar error previo si existe
    setProductInsertError(null);
    setErrorProductBarcode(null);

    try {
      showLoading();

      // Consultar datos del producto
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await HttpClient.get<ProductoConsultaResponse>(
        `${baseUrl}/pos/productos/consulta/${barcode}`
      );

      console.log("📦 Producto consultado:", response);

      // Guardar código de barras en variable local para evitar problemas de closure
      const productBarcode = response.codigo_barra || barcode;

      // Construir URL completa de la imagen
      const imagenUrl = response.foto ? `${baseUrl}${response.foto}` : "";

      // Crear producto con datos del endpoint
      const consultedProduct: Product = {
        cod_barra: productBarcode,
        descripcion: response.descripcion || `Producto ${barcode}`,
        category_id: 0,
        name: response.descripcion_corta || response.descripcion || `Producto ${barcode}`,
        sku: response.codigo || barcode,
        imagen: imagenUrl,
        precio: response.precio || 0,
        peso: parseFloat(response.peso_gramos || "0") || 0,
        es_pesable: response.pesable === 1,
        purchase_price: 0,
        tax: 0,
        stock: 0,
        stock_min: 0,
        active: true,
      };

      // Actualizar productos y cantidades de forma atómica
      setProducts((prevProducts) => {
        const existingProduct = prevProducts.find((p) => p.cod_barra === productBarcode);

        if (existingProduct) {
          console.log("✅ Cantidad incrementada para:", productBarcode);
          // Solo incrementar cantidad, no modificar lista
          return prevProducts;
        } else {
          console.log("✅ Producto nuevo agregado:", productBarcode, consultedProduct.descripcion);
          const updatedProducts = [...prevProducts, consultedProduct];

          const orderData = {
            products: updatedProducts,
            totalItems: updatedProducts.length,
            timestamp: new Date().toISOString(),
            source: "barcode_insert_mode",
          };
          sessionStorage.setItem("currentOrder", JSON.stringify(orderData));

          return updatedProducts;
        }
      });

      // Incrementar cantidad usando el código de barras local
      setProductQuantities((prev) => {
        const currentQty = prev[productBarcode] || 0;
        console.log(`📊 Actualizando cantidad de ${productBarcode}: ${currentQty} -> ${currentQty + 1}`);
        return {
          ...prev,
          [productBarcode]: currentQty + 1,
        };
      });

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error("❌ Error al consultar producto:", error);

      if (error instanceof ApiError) {
        if (error.status === 404) {
          showAlert(`Producto con código "${barcode}" no encontrado`);
        } else {
          showAlert(`Error al consultar producto: ${error.getUserFriendlyMessage()}`);
        }
      } else {
        showAlert("Error de conexión al consultar producto");
      }
    }
  };

  // Obtener número de caja desde invoiceData o configuración
  const getCaja = (): number => {
    const invoiceDataStr = sessionStorage.getItem("invoiceData");
    if (invoiceDataStr) {
      const parsed = JSON.parse(invoiceDataStr);
      return parsed.caja || 1;
    }
    return 1;
  };

  // Limpiar ticket y recrear factura (para manejo de errores)
  const cleanAndRecreateInvoice = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const caja = getCaja();

    try {
      // 1. Limpiar ticket
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/ticket-clean`, { caja });
      console.log("✅ Ticket limpiado");

      // 2. Recrear factura con el cliente actual
      const documento = invoiceData.ruc || "44444401-7";
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

  // Insertar productos en el backend
  const insertProductsToBackend = async (): Promise<boolean> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const caja = getCaja();

    // Construir payload
    const productosPayload: ProductoInsert[] = products.map((product) => {
      const cantidad = productQuantities[product.cod_barra] || 1;
      return {
        cod_barra: product.cod_barra,
        descripcion: product.descripcion,
        cantidad,
        precio_unitario: product.precio,
        subtotal: product.precio * cantidad,
      };
    });

    const payload = {
      caja,
      productos: productosPayload,
    };

    console.log("📤 Enviando productos al backend:", payload);

    try {
      const response = await HttpClient.post<InsertProductsResponse>(
        `${baseUrl}/pos/ventas-aut/insertar-productos`,
        payload
      );

      console.log("✅ Productos insertados exitosamente:", response);
      return true;
    } catch (error) {
      console.error("❌ Error al insertar productos:", error);

      if (error instanceof ApiError) {
        const errorData = error.response as InsertProductsError | undefined;

        if (errorData?.cod_barra) {
          // Error de producto específico
          setErrorProductBarcode(errorData.cod_barra);
          setProductInsertError(`Error en producto ${errorData.cod_barra}: ${errorData.message}`);
          showAlert(`Error: ${errorData.message} (Código: ${errorData.cod_barra})`);
        } else {
          // Error genérico
          setProductInsertError(errorData?.message || "Error al insertar productos");
          showAlert(errorData?.message || "Error al insertar productos");
        }

        // Limpiar y recrear factura
        await cleanAndRecreateInvoice();
      } else {
        setProductInsertError("Error de conexión al insertar productos");
        showAlert("Error de conexión. Intente nuevamente.");
        await cleanAndRecreateInvoice();
      }

      return false;
    }
  };

  // Handler de pago con inserción de productos
  const handlePagarWithInsert = async () => {
    console.log("Iniciando proceso de pago con inserción de productos...");
    setIsInsertingProducts(true);
    setProductInsertError(null);
    setErrorProductBarcode(null);

    try {
      showLoading();

      // Insertar productos en el backend
      const success = await insertProductsToBackend();

      if (!success) {
        console.log("❌ Fallo la inserción de productos");
        hideLoading();
        setIsInsertingProducts(false);
        return;
      }

      hideLoading();
      setIsInsertingProducts(false);

      // Continuar con la validación de peso
      handlePagar();
    } catch (error) {
      console.error("❌ Error en handlePagarWithInsert:", error);
      hideLoading();
      setIsInsertingProducts(false);
      showAlert("Error inesperado. Intente nuevamente.");
    }
  };

  // Calcular peso esperado total en kg
  const calculateExpectedWeight = useCallback((): number => {
    return products.reduce((total, product) => {
      const quantity = productQuantities[product.cod_barra] || 1;
      const pesoGramos = product.peso || 0;
      return total + (pesoGramos * quantity);
    }, 0) / 1000; // Convertir gramos a kg
  }, [products, productQuantities]);

  // Calcular tolerancia híbrida: clamp(peso × porcentaje, min, max)
  // Valores configurables desde .env
  const calculateHybridTolerance = (expectedWeightKg: number): number => {
    const percentage = parseFloat(import.meta.env.VITE_TOLERANCE_PERCENTAGE) || 0.05;
    const minKg = parseFloat(import.meta.env.VITE_TOLERANCE_MIN_KG) || 0.03;
    const maxKg = parseFloat(import.meta.env.VITE_TOLERANCE_MAX_KG) || 0.15;

    const calculated = expectedWeightKg * percentage;
    const clamped = Math.max(minKg, Math.min(calculated, maxKg));

    console.log(`📊 Tolerancia híbrida - Peso esperado: ${expectedWeightKg}kg, Calculada: ${(calculated * 1000).toFixed(0)}g, Final: ${(clamped * 1000).toFixed(0)}g`);

    return clamped;
  };

  // Conectar al WebSocket de la balanza para validación
  const connectValidationScale = useCallback(() => {
    // Cerrar conexión existente si hay
    if (scaleSocketRef.current) {
      scaleSocketRef.current.close();
    }

    const scaleUrl = import.meta.env.VITE_SOCKET_VALIDATION_SCALE_URL || "ws://localhost:3001";
    console.log("🔌 Conectando a balanza de validación:", scaleUrl);

    const socket = new WebSocket(scaleUrl);
    scaleSocketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ Conectado a balanza de validación");
      setWeightValidationStatus("waiting");
    };

    socket.onmessage = (event) => {
      try {
        const data: ScaleData = JSON.parse(event.data);
        console.log("⚖️ Peso recibido:", data);

        if (data.peso !== undefined) {
          setCurrentWeight(data.peso);

          // Solo validar cuando el peso está estable y es mayor a 0
          // Si el peso es 0, mantener el mensaje "Coloque los productos en la balanza"
          if (data.estable && data.status === "ST" && data.peso > 0) {
            validateWeight(data.peso);
          }
        }
      } catch (error) {
        console.error("Error al parsear datos de balanza:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ Error en WebSocket de balanza:", error);
      setWeightError("Error de conexión con la balanza");
      setWeightValidationStatus("error");
    };

    socket.onclose = () => {
      console.log("🔌 Desconectado de balanza de validación");
    };
  }, []);

  // Validar peso (usa refs para acceder a valores actualizados en el callback del WebSocket)
  const validateWeight = useCallback((currentPeso: number) => {
    const expected = expectedWeightRef.current;
    const tol = toleranceRef.current;
    const diff = Math.abs(currentPeso - expected);

    console.log(`📊 Validando peso - Esperado: ${expected}kg, Actual: ${currentPeso}kg, Diferencia: ${diff}kg, Tolerancia: ${tol}kg`);

    if (diff <= tol) {
      console.log("✅ Peso válido - dentro de tolerancia");
      setWeightValidationStatus("success");

      // Desconectar balanza y proceder al pago después de un momento
      setTimeout(() => {
        disconnectValidationScale();
        proceedToPayment();
      }, 1500);
    } else {
      console.log("❌ Peso fuera de tolerancia");
      setWeightError(
        `El peso no coincide. Esperado: ${expected.toFixed(3)}kg, Actual: ${currentPeso.toFixed(3)}kg`
      );
      setWeightValidationStatus("error");
    }
  }, []);

  // Desconectar WebSocket de validación
  const disconnectValidationScale = () => {
    if (scaleSocketRef.current) {
      scaleSocketRef.current.close();
      scaleSocketRef.current = null;
    }
  };

  // Proceder al pago (usa refs para evitar closure stale en callbacks del WebSocket)
  const proceedToPayment = useCallback(() => {
    const currentProducts = productsRef.current;
    const currentQuantities = productQuantitiesRef.current;

    const totalAmount = currentProducts.reduce((total, product) => {
      const quantity = currentQuantities[product.cod_barra] || 1;
      console.log(`💰 Producto: ${product.descripcion}, precio: ${product.precio}, cantidad: ${quantity}, subtotal: ${product.precio * quantity}`);
      return total + product.precio * quantity;
    }, 0);

    console.log("💰 Total calculado en proceedToPayment:", totalAmount);
    console.log("💰 Products:", currentProducts);
    console.log("💰 ProductQuantities:", currentQuantities);

    setShowWeightModal(false);
    navigate("/payment-selection", {
      state: {
        products: currentProducts,
        totalAmount,
        ruc: invoiceData.ruc,
        razonSocial: invoiceData.razonSocial,
        productQuantities: currentQuantities,
      },
    });
  }, [navigate, invoiceData.ruc, invoiceData.razonSocial]);

  // Cancelar validación de peso
  const handleCancelWeightValidation = async () => {
    disconnectValidationScale();
    setShowWeightModal(false);
    setWeightValidationStatus("idle");
    setCurrentWeight(0);
    setWeightError("");

    // Limpiar ticket y recrear factura (solo en modo inserción)
    if (useInsertProductsMode) {
      showLoading();
      await cleanAndRecreateInvoice();
      hideLoading();
    }
  };

  const handlePagar = () => {
    console.log("Iniciando validación de peso...");

    // Calcular peso esperado
    const expected = calculateExpectedWeight();
    setExpectedWeight(expected);
    expectedWeightRef.current = expected; // Actualizar ref para el callback del WebSocket

    // Si no hay peso esperado (productos sin peso), ir directo al pago
    if (expected <= 0) {
      console.log("⚠️ No hay peso esperado, procediendo al pago directamente");
      proceedToPayment();
      return;
    }

    // Calcular tolerancia híbrida basada en el peso esperado
    const toleranceValue = calculateHybridTolerance(expected);
    setTolerance(toleranceValue);
    toleranceRef.current = toleranceValue; // Actualizar ref para el callback del WebSocket

    // Mostrar modal y conectar a la balanza
    setShowWeightModal(true);
    setWeightValidationStatus("waiting");
    setWeightError("");
    setCurrentWeight(0);

    // Conectar a la balanza
    connectValidationScale();
  };

  const handleCancelar = async () => {
    console.log("Cancelando orden...");
    setIsCancelling(true);

    try {
      // Limpiar ticket en el servidor
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/ticket-clean`, {
        caja: 1,
      });
      console.log("✅ Ticket limpiado en el servidor");
    } catch (error) {
      console.error("❌ Error al limpiar ticket:", error);
      // Continuar con la cancelación aunque falle el request
    }

    // Limpiar estado local
    setProducts([]);
    setProductQuantities({});
    // Limpiar sessionStorage
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    setIsCancelling(false);
    navigate("/menu");
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) =>
      prev.filter((product) => product.cod_barra !== productId),
    );
    setProductQuantities((prev) => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  const handleIncrementQuantity = async (productId: string) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // Hacer request al endpoint scan para registrar el incremento
      await HttpClient.post(`${baseUrl}/pos/productos/scan`, {
        scan: productId,
        cantidad: 1,
      });

      // Incrementar cantidad localmente
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] || 1) + 1,
      }));
    } catch (error) {
      console.error("Error al incrementar cantidad:", error);
      if (error instanceof ApiError) {
        showAlert(`Error: ${error.message}`);
      } else {
        showAlert("Error al incrementar cantidad");
      }
    }
  };

  const handleDecrementQuantity = (productId: string) => {
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) - 1),
    }));
  };

  return (
    <div className="h-screen bg-secondary-100 flex flex-col p-2 md:p-3 lg:p-4 xl:p-7 overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-2 md:p-3 lg:p-4 xl:p-8 mb-1 md:mb-2 lg:mb-3 xl:mb-4 flex-shrink-0">
          {/* Logo */}
          <div className="flex justify-center mb-1 md:mb-2 lg:mb-3 xl:mb-4">
            <img src={archiLogo} alt="Archi" className="h-auto w-24 md:w-32 lg:w-48 xl:w-96" />
          </div>
          {/* Welcome Message */}
          <h2 className="text-base md:text-lg lg:text-2xl xl:text-4xl font-semibold text-primary-600 text-center">
            {userName}
          </h2>
        </div>

        {/* Products List */}
        <div className="flex-1 min-h-0 mb-1 md:mb-2 lg:mb-3 xl:mb-6 overflow-y-auto bg-primary-50 rounded-lg shadow-inner relative">
          {/* Logo de fondo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={archiLogo}
              alt=""
              className="w-1/2 max-w-md opacity-10"
            />
          </div>
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-primary-600 text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold">
                  Escanee los productos
                  <br />
                  para agregarlos
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 md:p-3 lg:p-4 xl:p-6">
              {/* Headers */}
              <div className="flex items-center gap-2 md:gap-3 lg:gap-4 xl:gap-8 mb-2 md:mb-3 lg:mb-4 xl:mb-6 px-2 md:px-3 lg:px-4 xl:px-6">
                <div className="flex-shrink-0 w-12 md:w-14 lg:w-16 xl:w-24"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    Producto
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-36">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    Cantidad
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    Precio
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    Sub Total
                  </div>
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
                    onIncrement={handleIncrementQuantity}
                    onDecrement={handleDecrementQuantity}
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
                Total a Pagar:
              </div>
              <div className="text-base md:text-lg lg:text-xl xl:text-5xl font-bold text-primary-600">
                ₲
                {products
                  .reduce((total, product) => {
                    const quantity = productQuantities[product.cod_barra] || 1;
                    return total + product.precio * quantity;
                  }, 0)
                  .toLocaleString("es-PY")}
              </div>
            </div>
          </div>
        </div>

        {/* Error de inserción de producto */}
        {productInsertError && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{productInsertError}</span>
              {errorProductBarcode && (
                <span className="ml-2 bg-red-200 px-2 py-1 rounded text-sm">
                  Código: {errorProductBarcode}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 md:gap-3 lg:gap-4 xl:gap-6 flex-shrink-0">
          <button
            onClick={useInsertProductsMode ? handlePagarWithInsert : handlePagar}
            disabled={products.length === 0 || isInsertingProducts}
            className="w-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 md:py-4 lg:py-5 xl:py-11 rounded-lg text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold transition-colors duration-200"
          >
            {isInsertingProducts ? "Procesando..." : "Pagar"}
          </button>

          <button
            onClick={handleCancelar}
            disabled={isCancelling}
            className="w-full bg-gray-300 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 py-3 md:py-4 lg:py-5 xl:py-11 rounded-lg text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold transition-colors duration-200"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isCancelling && (
        <div className="fixed inset-0 bg-white/80 flex flex-col items-center justify-center z-50">
          <img
            src={archiLogo}
            alt="Cargando..."
            className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 object-contain animate-spin"
          />
        </div>
      )}

      {/* Modal de Validación de Peso */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-3 lg:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl lg:rounded-3xl p-4 md:p-5 lg:p-6 xl:p-12 w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl shadow-2xl flex flex-col items-center">
            {/* Estado: Esperando peso */}
            {(weightValidationStatus === "waiting" || weightValidationStatus === "error") && (
              <>
                {/* Icono de balanza digital */}
                <div className={`w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-40 xl:h-40 ${weightValidationStatus === "error" ? "bg-red-100" : "bg-primary-100"} rounded-full flex items-center justify-center mb-3 md:mb-4 lg:mb-6 xl:mb-8`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 xl:h-24 xl:w-24 ${weightValidationStatus === "error" ? "text-red-600" : "text-primary-600"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    {/* Plataforma de la balanza */}
                    <rect x="2" y="16" width="20" height="2" rx="0.5" />
                    {/* Base/soporte */}
                    <path d="M6 18v2h12v-2" />
                    <rect x="4" y="20" width="16" height="2" rx="0.5" />
                    {/* Columna central */}
                    <rect x="10" y="8" width="4" height="8" rx="0.5" />
                    {/* Display digital */}
                    <rect x="5" y="2" width="14" height="6" rx="1" />
                    {/* Pantalla del display */}
                    <rect x="7" y="3.5" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
                  </svg>
                </div>

                <h2 className={`text-lg md:text-xl lg:text-2xl xl:text-4xl font-bold ${weightValidationStatus === "error" ? "text-red-600" : "text-primary-600"} mb-1 md:mb-2 lg:mb-3 xl:mb-4 text-center`}>
                  {weightValidationStatus === "error"
                    ? "Los pesos no coinciden"
                    : "Coloque los productos en la balanza"}
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-600 mb-3 md:mb-4 lg:mb-5 xl:mb-6 text-center">
                  {weightValidationStatus === "error"
                    ? "Ajuste los productos y espere..."
                    : "Esperando lectura de peso estable..."}
                </p>

                {/* Logo girando */}
                <img
                  src={archiLogo}
                  alt="Cargando..."
                  className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 object-contain animate-spin mb-3 md:mb-4 lg:mb-5 xl:mb-6"
                />

                {/* Botón cancelar */}
                <button
                  onClick={handleCancelWeightValidation}
                  className="bg-gray-300 text-gray-800 font-bold py-2 md:py-2.5 lg:py-3 xl:py-4 px-6 md:px-8 lg:px-10 xl:px-12 rounded-lg xl:rounded-xl transition-colors duration-200 text-sm md:text-base lg:text-lg xl:text-xl"
                >
                  Cancelar
                </button>
              </>
            )}

            {/* Estado: Éxito */}
            {weightValidationStatus === "success" && (
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
                  Peso verificado correctamente
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-500">
                  Redirigiendo al pago...
                </p>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
