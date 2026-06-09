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
import { ARCHI_ENDPOINTS } from "../../../config/endpoints/archi";
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

// Tipo para respuesta del endpoint /scanning-peso
interface ScanningPesoResponse {
  scanning: string;
  controlPeso: number | null;
  toleranciaIndividual: number | null;
  peso_gramos: number;
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
  const [showClearModal, setShowClearModal] = useState(false);

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

  // Estado y ref para bloquear escaneo durante validación de peso per-scan
  // El ref es necesario porque los handlers de barcodeService capturan closures stale
  const [isWeightValidationPending, setIsWeightValidationPending] = useState(false);
  const isWeightValidationPendingRef = useRef(false);
  const showWeightModalRef = useRef(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCancelRef = useRef<number>(0);
  const pendingWeightProductRef = useRef<{ cod_barra: string; codigo: string } | null>(null);
  const isCallingWeightEndpointRef = useRef(false);

  // Estados para modo de inserción de productos
  const [productInsertError, setProductInsertError] = useState<string | null>(null);
  const [errorProductBarcode, setErrorProductBarcode] = useState<string | null>(null);
  const [isInsertingProducts, setIsInsertingProducts] = useState(false);

  // Helper para actualizar state + ref de validación de peso
  const setWeightValidationPending = (value: boolean) => {
    isWeightValidationPendingRef.current = value;
    setIsWeightValidationPending(value);
  };

  // Modo de operación: true = usar endpoint insertar-productos, false = lógica actual
  const useInsertProductsMode = import.meta.env.VITE_USE_INSERT_PRODUCTS_MODE === "true";

  // Mantener refs sincronizadas con el estado
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    productQuantitiesRef.current = productQuantities;
  }, [productQuantities]);

  useEffect(() => {
    showWeightModalRef.current = showWeightModal;
  }, [showWeightModal]);

  // useEffect para monitoreo continuo de peso
  // Se ejecuta cada vez que cambian products o productQuantities
  useEffect(() => {
    let totalWeightKg = 0;
    for (const product of products) {
      const qty = productQuantities[product.cod_barra] || 1;
      totalWeightKg += (product.peso || 0) * qty;
    }
    totalWeightKg = totalWeightKg / 1000; // gramos a kg

    expectedWeightRef.current = totalWeightKg;
    setExpectedWeight(totalWeightKg);

    if (totalWeightKg > 0) {
      // Calcular tolerancia
      const percentage = parseFloat(import.meta.env.VITE_TOLERANCE_PERCENTAGE) || 0.05;
      const minKg = parseFloat(import.meta.env.VITE_TOLERANCE_MIN_KG) || 0.03;
      const maxKg = parseFloat(import.meta.env.VITE_TOLERANCE_MAX_KG) || 0.15;
      const calculated = totalWeightKg * percentage;
      const tol = Math.max(minKg, Math.min(calculated, maxKg));
      toleranceRef.current = tol;
      setTolerance(tol);

      console.log(`📊 Peso esperado recalculado: ${totalWeightKg.toFixed(3)}kg, Tolerancia: ${(tol * 1000).toFixed(0)}g`);

      // Conectar balanza si no está conectada
      if (
        !scaleSocketRef.current ||
        scaleSocketRef.current.readyState === WebSocket.CLOSED ||
        scaleSocketRef.current.readyState === WebSocket.CLOSING
      ) {
        connectValidationScale();
      }
    } else {
      // No hay productos con peso conocido
      // Si hay un producto pendiente de determinación de peso, NO desconectar la balanza
      if (pendingWeightProductRef.current) {
        console.log("⚖️ Producto pendiente de determinación de peso, manteniendo balanza conectada");
        return;
      }
      // Desconectar balanza y cerrar modal
      disconnectValidationScale();
      if (showWeightModalRef.current) {
        setShowWeightModal(false);
        setWeightValidationStatus("idle");
        setWeightError("");
        setCurrentWeight(0);
        setWeightValidationPending(false);
      }
    }
  }, [products, productQuantities]);

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
      // Limpiar timeout de success
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
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

    // Bloquear escaneo mientras hay validación de peso pendiente (usa ref para evitar closure stale)
    if (isWeightValidationPendingRef.current) {
      console.log("⚠️ Validación de peso pendiente, ignorando escaneo");
      return;
    }

    console.log("✅ SaleScreen procesando código de barras:", barcode);

    try {
      showLoading();
      // Buscar producto por código de barras
      const cantidadAcumulada = (productQuantitiesRef.current[barcode] || 0) + 1;
      const product: ScannedProduct | null =
        await ProductService.getProductByBarcode(barcode, 1, cantidadAcumulada);

      if (product) {
        // Construir URL completa de la imagen
        const imagenUrl = product.imagen ? `${import.meta.env.VITE_API_BASE_URL}${product.imagen}` : "";

        // Mapear el producto de la API al formato local
        const mappedProduct: Product = {
          cod_barra: product.codigo_barras,
          descripcion: product.descripcion,
          category_id: 0,
          name: product.descripcion,
          sku: product.codigo_barras,
          imagen: imagenUrl,
          precio: product.precio,
          total: product.total,
          total_venta: product.total_venta,
          cantidad: product.cantidad,
          peso: parseFloat(product.peso_gramos) || 0,
          es_pesable: product.es_pesable ?? false,
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
            // Si ya existe, actualizar cantidad y total desde la respuesta
            console.log("✅ Cantidad incrementada para:", mappedProduct.name);
            return prevProducts.map((p) =>
              p.cod_barra === mappedProduct.cod_barra
                ? { ...p, cantidad: mappedProduct.cantidad, total: mappedProduct.total }
                : p
            );
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

        // Detectar peso_gramos vacío en producto nuevo → determinar peso con balanza
        const isNewProduct = !productsRef.current.some(p => p.cod_barra === mappedProduct.cod_barra);
        if (isNewProduct && (product.peso_gramos === "" || product.peso_gramos === undefined || product.peso_gramos === null)) {
          console.log("⚖️ Producto con peso desconocido, iniciando determinación de peso:", product.codigo);
          pendingWeightProductRef.current = { cod_barra: mappedProduct.cod_barra, codigo: product.codigo };
          setShowWeightModal(true);
          setWeightValidationStatus("waiting");
          setWeightError("");
          setWeightValidationPending(true);
          // Asegurar que la balanza esté conectada
          if (
            !scaleSocketRef.current ||
            scaleSocketRef.current.readyState === WebSocket.CLOSED ||
            scaleSocketRef.current.readyState === WebSocket.CLOSING
          ) {
            connectValidationScale();
          }
        }
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

    // Bloquear escaneo mientras hay validación de peso pendiente (usa ref para evitar closure stale)
    if (isWeightValidationPendingRef.current) {
      console.log("⚠️ Validación de peso pendiente, ignorando escaneo");
      return;
    }

    console.log("✅ SaleScreen (modo inserción) procesando código de barras:", barcode);

    // Limpiar error previo si existe
    setProductInsertError(null);
    setErrorProductBarcode(null);

    try {
      showLoading();

      // Consultar datos del producto
      const response = await HttpClient.get<ProductoConsultaResponse>(
        ARCHI_ENDPOINTS.consultaProducto(barcode)
      );

      console.log("📦 Producto consultado:", response);

      // Guardar código de barras en variable local para evitar problemas de closure
      const productBarcode = response.codigo_barra || barcode;

      // Construir URL completa de la imagen
      const imagenUrl = response.foto ? `${import.meta.env.VITE_API_BASE_URL}${response.foto}` : "";

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

      // Detectar peso_gramos vacío en producto nuevo → determinar peso con balanza
      const isNewProduct = !productsRef.current.some(p => p.cod_barra === productBarcode);
      if (isNewProduct && (!response.peso_gramos || response.peso_gramos === "")) {
        console.log("⚖️ Producto con peso desconocido, iniciando determinación de peso:", response.codigo);
        pendingWeightProductRef.current = { cod_barra: productBarcode, codigo: response.codigo };
        setShowWeightModal(true);
        setWeightValidationStatus("waiting");
        setWeightError("");
        setWeightValidationPending(true);
        // Asegurar que la balanza esté conectada
        if (
          !scaleSocketRef.current ||
          scaleSocketRef.current.readyState === WebSocket.CLOSED ||
          scaleSocketRef.current.readyState === WebSocket.CLOSING
        ) {
          connectValidationScale();
        }
      }

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
    const caja = getCaja();

    try {
      // 1. Limpiar ticket
      await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja });
      console.log("✅ Ticket limpiado");

      // 2. Recrear factura con el cliente actual
      const documento = invoiceData.ruc || "44444401-7";
      await HttpClient.post(ARCHI_ENDPOINTS.createInvoice, {
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
        ARCHI_ENDPOINTS.insertarProductos,
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

      // Ir directo al pago (validación de peso se hace per-scan)
      proceedToPayment();
    } catch (error) {
      console.error("❌ Error en handlePagarWithInsert:", error);
      hideLoading();
      setIsInsertingProducts(false);
      showAlert("Error inesperado. Intente nuevamente.");
    }
  };

  // Conectar al WebSocket de la balanza para monitoreo continuo
  const connectValidationScale = useCallback(() => {
    // Cerrar conexión existente si hay
    if (scaleSocketRef.current) {
      scaleSocketRef.current.close();
    }

    const scaleUrl = import.meta.env.VITE_SOCKET_VALIDATION_SCALE_URL || "ws://localhost:3001";
    console.log("🔌 Conectando a balanza de validación (monitoreo continuo):", scaleUrl);

    const socket = new WebSocket(scaleUrl);
    scaleSocketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ Conectado a balanza de validación (monitoreo continuo)");
    };

    socket.onmessage = (event) => {
      try {
        const data: ScaleData = JSON.parse(event.data);

        if (data.peso === undefined) return;

        setCurrentWeight(data.peso);

        // --- Modo determinación de peso (producto con peso_gramos vacío) ---
        const pending = pendingWeightProductRef.current;
        if (pending) {
          if (data.estable && data.status === "ST" && data.peso > 0 && !isCallingWeightEndpointRef.current) {
            // Calcular peso conocido de todos los productos excepto el pendiente
            const prods = productsRef.current;
            const qtys = productQuantitiesRef.current;
            let knownWeightGrams = 0;
            for (const p of prods) {
              if (p.cod_barra !== pending.cod_barra) {
                const qty = qtys[p.cod_barra] || 1;
                knownWeightGrams += (p.peso || 0) * qty;
              }
            }
            const knownWeightKg = knownWeightGrams / 1000;
            const differenceGrams = Math.round((data.peso - knownWeightKg) * 1000);

            console.log(`⚖️ Determinación de peso - Lectura: ${data.peso}kg, Conocido: ${knownWeightKg}kg, Diferencia: ${differenceGrams}g`);

            if (differenceGrams > 0) {
              isCallingWeightEndpointRef.current = true;
              setWeightValidationStatus("validating");

              HttpClient.post<ScanningPesoResponse>(
                ARCHI_ENDPOINTS.scanningPeso,
                { scanning: pending.codigo, peso_gramos: differenceGrams }
              ).then((response) => {
                console.log("✅ /scanning-peso respuesta:", response);
                const newPeso = response.peso_gramos;
                // Actualizar peso del producto en la lista
                setProducts(prev => prev.map(p =>
                  p.cod_barra === pending.cod_barra
                    ? { ...p, peso: newPeso }
                    : p
                ));
                pendingWeightProductRef.current = null;
                isCallingWeightEndpointRef.current = false;
                // Mostrar éxito
                setWeightValidationStatus("success");
                successTimeoutRef.current = setTimeout(() => {
                  setShowWeightModal(false);
                  setWeightValidationStatus("idle");
                  setWeightError("");
                  setCurrentWeight(0);
                  setWeightValidationPending(false);
                  successTimeoutRef.current = null;
                }, 1500);
              }).catch((error) => {
                console.error("❌ Error en /scanning-peso:", error);
                isCallingWeightEndpointRef.current = false;
                setWeightError("Error al determinar peso del producto");
                setWeightValidationStatus("error");
              });
            }
          }
          return; // No hacer monitoreo normal mientras hay peso pendiente
        }

        // --- Monitoreo continuo normal ---
        const expected = expectedWeightRef.current;
        const tol = toleranceRef.current;

        // Si no hay peso esperado, no validar
        if (expected <= 0) return;

        if (data.estable && data.status === "ST") {
          if (data.peso === 0) {
            // Balanza vacía pero se espera peso
            if (successTimeoutRef.current) {
              clearTimeout(successTimeoutRef.current);
              successTimeoutRef.current = null;
            }
            if (!showWeightModalRef.current && Date.now() - lastCancelRef.current > 3000) {
              setShowWeightModal(true);
              setWeightValidationPending(true);
            }
            if (showWeightModalRef.current) {
              setWeightValidationStatus("waiting");
              setWeightError("");
            }
          } else {
            const diff = Math.abs(data.peso - expected);

            if (diff <= tol) {
              // Peso coincide
              if (showWeightModalRef.current && successTimeoutRef.current === null) {
                setWeightValidationStatus("success");
                successTimeoutRef.current = setTimeout(() => {
                  setShowWeightModal(false);
                  setWeightValidationStatus("idle");
                  setWeightError("");
                  setCurrentWeight(0);
                  setWeightValidationPending(false);
                  successTimeoutRef.current = null;
                }, 1500);
              }
              // Si modal no está abierto, todo bien, no hacer nada
            } else {
              // Peso no coincide
              if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
              }
              if (!showWeightModalRef.current && Date.now() - lastCancelRef.current > 3000) {
                setShowWeightModal(true);
                setWeightValidationPending(true);
              }
              if (showWeightModalRef.current) {
                setWeightError(
                  `El peso no coincide. Esperado: ${expected.toFixed(3)}kg, Actual: ${data.peso.toFixed(3)}kg`
                );
                setWeightValidationStatus("error");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error al parsear datos de balanza:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ Error en WebSocket de balanza:", error);
    };

    socket.onclose = () => {
      console.log("🔌 Desconectado de balanza de validación");
    };
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

  // Cancelar validación de peso (cierra modal pero NO desconecta la balanza)
  const _handleCancelWeightValidation = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    // Limpiar estado de determinación de peso pendiente
    pendingWeightProductRef.current = null;
    isCallingWeightEndpointRef.current = false;
    setShowWeightModal(false);
    setWeightValidationStatus("idle");
    setCurrentWeight(0);
    setWeightError("");
    setWeightValidationPending(false);
    lastCancelRef.current = Date.now();
    // NO desconectar la balanza - debe seguir monitoreando
    // El modal volverá a aparecer después de 3s si el peso sigue sin coincidir
  };

  const handlePagar = () => {
    console.log("Procediendo al pago directamente (validación de peso se hace per-scan)...");
    proceedToPayment();
  };

  const handleCancelar = async () => {
    console.log("Cancelando orden...");
    setIsCancelling(true);

    try {
      // Limpiar ticket en el servidor
      await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja: 1 });
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
      const cantidadAcumulada = (productQuantitiesRef.current[productId] || 1) + 1;
      const response = await HttpClient.post<ScannedProduct>(ARCHI_ENDPOINTS.scanProducto, {
        scan: productId,
        cantidad_a_insertar: 1,
        cantidad_acumulada: cantidadAcumulada,
      });

      // Actualizar cantidad y total del producto desde la respuesta
      setProducts((prev) =>
        prev.map((p) =>
          p.cod_barra === productId
            ? { ...p, cantidad: response.cantidad, total: response.total }
            : p
        )
      );

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

  const handleDecrementQuantity = (_productId: string) => {
    setShowClearModal(true);
  };

  const handleConfirmClear = async () => {
    setIsCancelling(true);
    setShowClearModal(false);
    try {
      await HttpClient.post(ARCHI_ENDPOINTS.ticketClean, { caja: 1 });
      console.log("✅ Ticket limpiado en el servidor");
    } catch (error) {
      console.error("❌ Error al limpiar ticket:", error);
    }
    setProducts([]);
    setProductQuantities({});
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    setIsCancelling(false);
  };

  return (
    <div className="h-screen bg-secondary-100 flex flex-col p-2 md:p-3 lg:p-4 xl:p-7 overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-2 md:p-2 lg:p-3 xl:p-5 mb-1 md:mb-2 lg:mb-3 xl:mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Logo achicado */}
            <img src={archiLogo} alt="Archi" className="h-auto w-16 md:w-20 lg:w-28 xl:w-48" />
            {/* Nombre del cliente */}
            <span className="text-sm md:text-base lg:text-lg xl:text-2xl font-medium text-primary-600">
              {userName}
            </span>
          </div>
          {/* Instrucción destacada */}
          <p className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600 text-center mt-1 md:mt-2 lg:mt-3 xl:mt-4 animate-pulse">
            Escanee sus productos para agregarlos
          </p>
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

      {/* Modal Confirmación Limpiar Productos */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 xl:p-10 w-full max-w-md xl:max-w-xl shadow-2xl flex flex-col items-center gap-4 xl:gap-6">
            <div className="w-16 h-16 xl:w-24 xl:h-24 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 xl:w-12 xl:h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl xl:text-3xl font-bold text-gray-900 text-center">¿Limpiar lista de productos?</h2>
            <p className="text-gray-600 xl:text-xl text-center">Esta acción borrará todos los productos de la lista para poder cargarlos de nuevo.</p>
            <div className="flex gap-3 xl:gap-4 w-full mt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 xl:py-5 rounded-xl text-base xl:text-2xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 xl:py-5 rounded-xl text-base xl:text-2xl font-semibold transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Estado: Esperando peso / Determinando peso / Error */}
            {(weightValidationStatus === "waiting" || weightValidationStatus === "validating" || weightValidationStatus === "error") && (
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
                  Coloque los productos en la balanza
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-600 mb-3 md:mb-4 lg:mb-5 xl:mb-6 text-center">
                  {weightValidationStatus === "error"
                    ? "Por favor, coloque todos los productos escaneados en la balanza"
                    : weightValidationStatus === "validating"
                    ? "Consultando peso al servidor..."
                    : "Esperando lectura de peso estable..."}
                </p>

                {/* Logo girando */}
                <img
                  src={archiLogo}
                  alt="Cargando..."
                  className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 object-contain animate-spin"
                />
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
                  Puede continuar escaneando...
                </p>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
