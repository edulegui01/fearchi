import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import marketLogo from "../../../assets/possible_market_logo.png";
import caritaPosible from "../../../assets/carita_posible.png";
import ProductItem from "../../components/ProductItem";
import { barcodeService } from "../../../services/BarcodeService";
import ProductService from "../../../services/product/ProductService";
import { getSaleBackend } from "../../../services/sale/SaleBackend";
import VisionService from "../../../services/VisionService";
import type { SaleLine } from "../../../services/sale/SaleBackend";
import { CAPASU_SESSION_KEY } from "../../../services/sale/SaleBackend";
import HttpClient from "../../../utils/httpClient";
import { ApiError } from "../../../utils/ApiError";
import { useLoading } from "../../common/LoadingContext";
import { useAlert } from "../../common/AlertContext";
import { useLanguage } from "../../common/LanguageContext";
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

// Error que devuelve el backend al rechazar el envío del carrito
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
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantities>(
    {},
  );
  // Total acumulado del ticket según el backend (Pegasus). Mientras sea null,
  // todavía no hubo ninguna interacción con el backend y se usa el cálculo
  // local como respaldo (ej. carrito recién llegado de WelcomeScreen/PriceCheck,
  // o modo inserción, donde no hay ticket en vivo en el backend).
  const [totalVenta, setTotalVenta] = useState<number | null>(null);
  const totalVentaRef = useRef<number | null>(null);
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
  const pendingWeightProductRef = useRef<{
    cod_barra: string;
    codigo: string;
    product_id?: number;
  } | null>(null);
  const isCallingWeightEndpointRef = useRef(false);
  // Confirma que la lectura "estable" de la balanza no sea un falso positivo transitorio:
  // exige la misma lectura en 2 mensajes consecutivos antes de aceptarla como peso final
  const stableReadingConfirmRef = useRef<{ peso: number; count: number } | null>(null);

  // Estados para modo de inserción de productos
  const [productInsertError, setProductInsertError] = useState<string | null>(null);
  const [errorProductBarcode, setErrorProductBarcode] = useState<string | null>(null);
  const [isInsertingProducts, setIsInsertingProducts] = useState(false);

  // Helper para actualizar state + ref de validación de peso
  const setWeightValidationPending = (value: boolean) => {
    isWeightValidationPendingRef.current = value;
    setIsWeightValidationPending(value);
  };

  // Backend contra el que corre esta terminal: el POS de archi o POSsible PDV.
  const saleBackend = getSaleBackend();

  // Modo de operación: true = carrito local que se manda entero al confirmar,
  // false = ticket vivo en el servidor, que se actualiza en cada escaneo.
  //
  // POSsible PDV no tiene ticket vivo —la compra nace completa al confirmar—,
  // así que contra ese backend el carrito local no es una opción sino la única
  // forma posible, y la variable de entorno deja de tener voz.
  const useInsertProductsMode =
    !saleBackend.usesLiveTicket ||
    import.meta.env.VITE_USE_INSERT_PRODUCTS_MODE === "true";

  // Arrancar la cámara al entrar en la pantalla de venta. La sesión de visión
  // dura exactamente lo que dura la compra: se suelta sola cuando el cobro se
  // aprueba, así que acá no hay nada que limpiar al desmontar. Volver a esta
  // pantalla dentro de la misma compra no reinicia lo ya reconocido.
  useEffect(() => {
    VisionService.abrir();
  }, []);

  // Mantener refs sincronizadas con el estado
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    productQuantitiesRef.current = productQuantities;
  }, [productQuantities]);

  useEffect(() => {
    totalVentaRef.current = totalVenta;
  }, [totalVenta]);

  useEffect(() => {
    showWeightModalRef.current = showWeightModal;
  }, [showWeightModal]);

  // useEffect para monitoreo continuo de peso
  // Se ejecuta cada vez que cambian products o productQuantities
  useEffect(() => {
    // Sin balanza no hay nada que monitorear, y dejar el peso esperado en cero
    // evita que el resto de la pantalla crea que tiene algo contra qué validar.
    if (!saleBackend.usesScale) {
      expectedWeightRef.current = 0;
      return;
    }

    let totalWeightGrams = 0;
    for (const product of products) {
      if (product.es_pesable) {
        // product.peso ya es el total acumulado en kg, no multiplicar por qty
        totalWeightGrams += (product.peso || 0) * 1000;
      } else {
        // product.peso es el peso por unidad en gramos (determinado vía balanza)
        const qty = productQuantities[product.cod_barra] || 1;
        totalWeightGrams += (product.peso || 0) * qty;
      }
    }
    const totalWeightKg = totalWeightGrams / 1000; // gramos a kg

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
  }, [products, productQuantities, saleBackend.usesScale]);

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

    // Verificar si se vuelve desde la selección de pago (mantener cantidades tal cual estaban)
    if (locationState?.fromPaymentBack && locationState?.products) {
      console.log(
        "⬅️ Productos recibidos al volver desde selección de pago:",
        locationState.products,
      );
      setProducts(locationState.products);
      setProductQuantities(locationState.productQuantities || {});
      setTotalVenta(locationState.totalAmount ?? null);
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
        // Mismo criterio que el listener del escáner: este código viene del
        // menú, pero es un escaneo como cualquier otro y tiene que ir al
        // backend configurado. Llamar directo a handleBarcodeScanned hacía que
        // el primer producto de cada compra —el que la inicia— se consultara
        // contra el POS de archi aun con la terminal corriendo contra POSsible
        // PDV, y ese endpoint devolvía un 405 de nginx.
        const handler = useInsertProductsMode
          ? handleBarcodeScannedSimple
          : handleBarcodeScanned;
        handler(pendingBarcode);
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
      const product: ScannedProduct | null =
        await ProductService.getProductByBarcode(barcode, 1);

      if (product) {
        // Total real del ticket según el backend (Pegasus)
        setTotalVenta(product.total_venta);

        // Construir URL completa de la imagen
        const imagenUrl = product.imagen ? `${import.meta.env.VITE_API_BASE_URL}${product.imagen}` : "";

        // Mapear el producto de la API al formato local
        const mappedProduct: Product = {
          cod_barra: product.codigo_barras,
          codigo: product.codigo,
          descripcion: product.descripcion,
          category_id: 0,
          name: product.descripcion,
          sku: product.codigo_barras,
          imagen: imagenUrl,
          precio: product.precio,
          total: product.total,
          total_venta: product.total_venta,
          cantidad: product.cantidad,
          peso: parseFloat(product.peso) || 0,
          es_pesable: product.es_pesable,
          purchase_price: 0,
          tax: 0,
          stock: 0,
          stock_min: 0,
          active: true,
        };

        // Usar callback para acceder al estado actual de products (evita closure stale)
        setProducts((prevProducts) => {
          // El código de barras de un pesable se regenera con el peso en cada lectura,
          // por eso la coincidencia se hace por código interno (estable) cuando está disponible
          const existingProduct = prevProducts.find(
            (p) =>
              (mappedProduct.codigo && p.codigo === mappedProduct.codigo) ||
              p.cod_barra === mappedProduct.cod_barra,
          );

          if (existingProduct) {
            // Si ya existe, actualizar cod_barra (puede haber cambiado para pesables), cantidad, peso y total desde la respuesta
            console.log("✅ Cantidad incrementada para:", mappedProduct.name);
            return prevProducts.map((p) =>
              p === existingProduct
                ? {
                    ...p,
                    cod_barra: mappedProduct.cod_barra,
                    cantidad: mappedProduct.cantidad,
                    peso: mappedProduct.peso,
                    total: mappedProduct.total,
                    total_venta: mappedProduct.total_venta,
                  }
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

        // Detectar peso vacío en producto nuevo no pesable → determinar peso con balanza
        const isNewProduct = !productsRef.current.some(p => p.cod_barra === mappedProduct.cod_barra);
        if (isNewProduct && (product.peso === "" || product.peso === undefined || product.peso === null)) {
          console.log("⚖️ Producto con peso desconocido, iniciando determinación de peso:", product.codigo);
          pendingWeightProductRef.current = { cod_barra: mappedProduct.cod_barra, codigo: product.codigo };
          stableReadingConfirmRef.current = null;
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
            t("saleScreen.productNotFoundWithCode", { barcode });
          console.warn("❌ Producto no encontrado:", errorMsg);
          showAlert(errorMsg);
        } else {
          // Otros errores de API (500, 503, etc.)
          console.error("💥 Error de API:", error);
          showAlert(t("saleScreen.searchProductError", { message: error.getUserFriendlyMessage() }));
        }
      } else {
        // Errores no relacionados con la API
        console.error("💥 Error inesperado:", error);
        showAlert(t("saleScreen.unexpectedSearchError"));
      }
    }
  };

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
      const response = await saleBackend.lookupProduct(barcode);

      // Código inexistente. No es una caída del sistema, así que se le avisa
      // al cliente y la pantalla sigue esperando el próximo escaneo.
      if (!response) {
        hideLoading();
        showAlert(t("saleScreen.productNotFoundInsertMode", { barcode }));
        return;
      }

      console.log("📦 Producto consultado:", response);

      // Guardar código de barras en variable local para evitar problemas de closure
      const productBarcode = response.barcode;

      // Crear producto con datos del endpoint
      const consultedProduct: Product = {
        cod_barra: productBarcode,
        codigo: response.codigo,
        product_id: response.productId,
        descripcion: response.descripcion,
        category_id: 0,
        name: response.descripcionCorta,
        sku: response.codigo || barcode,
        imagen: response.imagen,
        precio: response.precio,
        peso: response.pesoGramos ?? 0,
        es_pesable: response.esPesable,
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

      // Producto nuevo sin peso cargado → determinarlo con la balanza.
      // Sin balanza el peso no le importa a nadie, así que el producto entra
      // al carrito como cualquier otro en vez de frenar la compra.
      const isNewProduct = !productsRef.current.some(p => p.cod_barra === productBarcode);
      if (saleBackend.usesScale && isNewProduct && response.pesoGramos === null) {
        console.log("⚖️ Producto con peso desconocido, iniciando determinación de peso:", response.codigo);
        pendingWeightProductRef.current = {
          cod_barra: productBarcode,
          codigo: response.codigo,
          product_id: response.productId,
        };
        stableReadingConfirmRef.current = null;
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
          showAlert(t("saleScreen.productNotFoundInsertMode", { barcode }));
        } else {
          showAlert(t("saleScreen.queryProductError", { message: error.getUserFriendlyMessage() }));
        }
      } else if (error instanceof Error && error.message) {
        // El cliente de POSsible PDV lanza Error comun, no ApiError, asi que
        // sin esta rama un login rechazado o una URL mal configurada salian
        // como un "error de conexion" generico que no dice donde mirar.
        showAlert(t("saleScreen.queryProductError", { message: error.message }));
      } else {
        showAlert(t("saleScreen.connectionErrorQuery"));
      }
    }
  };

  // Dejar el backend usable después de un envío fallido
  const recoverFromSubmitError = async () => {
    try {
      await saleBackend.recoverFromSubmitError();
    } catch (error) {
      console.error("❌ Error al recuperar el backend:", error);
    }
  };

  // Mandar al backend el carrito que el cliente armó escaneando
  const insertProductsToBackend = async (): Promise<boolean> => {
    const lines: SaleLine[] = products.map((product) => ({
      productId: product.product_id,
      barcode: product.cod_barra,
      descripcion: product.descripcion,
      cantidad: productQuantities[product.cod_barra] || 1,
      precioUnitario: product.precio,
    }));

    console.log("📤 Enviando productos al backend:", lines);

    try {
      const result = await saleBackend.submitCart(
        lines,
        // Sin balanza no se midió nada: mandar el peso teórico de los
        // productos haría pasar por medición algo que nadie puso en un plato.
        saleBackend.usesScale
          ? Math.round(expectedWeightRef.current * 1000)
          : undefined,
        // Nulo cuando la compra es "sin nombre", que es lo que devuelve la
        // pantalla de facturación al no haber cliente elegido.
        invoiceData.customerId ?? null,
      );

      console.log("✅ Carrito enviado exitosamente:", result);

      // POSsible PDV crea la compra recién al confirmar, y el uuid es lo único
      // que la identifica después: sin guardarlo, el paso de cobro no tendría
      // contra qué cerrarla.
      if (result.sessionUuid) {
        sessionStorage.setItem(CAPASU_SESSION_KEY, result.sessionUuid);
      }

      return true;
    } catch (error) {
      console.error("❌ Error al insertar productos:", error);

      if (error instanceof ApiError) {
        const errorData = error.response as InsertProductsError | undefined;

        if (errorData?.cod_barra) {
          // Error de producto específico
          setErrorProductBarcode(errorData.cod_barra);
          setProductInsertError(t("saleScreen.productInsertErrorWithCode", { code: errorData.cod_barra, message: errorData.message }));
          showAlert(t("saleScreen.productInsertErrorWithCodeShort", { message: errorData.message, code: errorData.cod_barra }));
        } else {
          // Error genérico. `error.message` ya trae lo que dijo el backend, o
          // la operación y el código si no dijo nada: se prefiere a un texto
          // fijo que no distingue un carrito ya cerrado de un producto sin
          // stock.
          const detalle = errorData?.message || error.message
            || t("saleScreen.insertProductsErrorGeneric");
          setProductInsertError(detalle);
          showAlert(detalle);
        }

        // Limpiar y recrear factura
        await recoverFromSubmitError();
      } else {
        setProductInsertError(t("saleScreen.insertConnectionError"));
        showAlert(t("saleScreen.connectionErrorRetry"));
        await recoverFromSubmitError();
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
      showAlert(t("saleScreen.unexpectedErrorRetry"));
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
            // Confirmar que la lectura estable no sea un falso positivo transitorio de la balanza:
            // exigir la misma lectura (± 3g) en 2 mensajes consecutivos antes de aceptarla
            const CONFIRM_TOLERANCE_KG = 0.003;
            const REQUIRED_CONFIRMATIONS = 2;
            const prevConfirm = stableReadingConfirmRef.current;
            if (prevConfirm && Math.abs(prevConfirm.peso - data.peso) <= CONFIRM_TOLERANCE_KG) {
              stableReadingConfirmRef.current = { peso: data.peso, count: prevConfirm.count + 1 };
            } else {
              stableReadingConfirmRef.current = { peso: data.peso, count: 1 };
            }
            if (stableReadingConfirmRef.current.count < REQUIRED_CONFIRMATIONS) {
              return;
            }

            // Calcular peso conocido de todos los productos excepto el pendiente
            const prods = productsRef.current;
            const qtys = productQuantitiesRef.current;
            let knownWeightGrams = 0;
            for (const p of prods) {
              if (p.cod_barra !== pending.cod_barra) {
                if (p.es_pesable) {
                  // p.peso ya es el total acumulado en kg, no multiplicar por qty
                  knownWeightGrams += (p.peso || 0) * 1000;
                } else {
                  // p.peso es el peso por unidad (determinado vía balanza)
                  const qty = qtys[p.cod_barra] || 1;
                  knownWeightGrams += (p.peso || 0) * qty;
                }
              }
            }
            const knownWeightKg = knownWeightGrams / 1000;
            const differenceGrams = Math.round((data.peso - knownWeightKg) * 1000);

            console.log(`⚖️ Determinación de peso - Lectura: ${data.peso}kg, Conocido: ${knownWeightKg}kg, Diferencia: ${differenceGrams}g`);

            if (differenceGrams > 0) {
              isCallingWeightEndpointRef.current = true;
              setWeightValidationStatus("validating");

              saleBackend.saveProductWeight(
                { codigo: pending.codigo, productId: pending.product_id },
                differenceGrams,
              ).then((newPeso) => {
                console.log("✅ Peso guardado:", newPeso);
                // Actualizar peso del producto en la lista
                setProducts(prev => prev.map(p =>
                  p.cod_barra === pending.cod_barra
                    ? { ...p, peso: newPeso }
                    : p
                ));
                pendingWeightProductRef.current = null;
                stableReadingConfirmRef.current = null;
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
                console.error("❌ Error al guardar el peso:", error);
                isCallingWeightEndpointRef.current = false;
                setWeightError(t("saleScreen.weightDeterminationError"));
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
                  t("saleScreen.weightMismatch", { expected: expected.toFixed(3), actual: data.peso.toFixed(3) })
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

  // Cálculo de respaldo, solo para cuando todavía no hay un total_venta
  // confirmado por el backend (ej. modo inserción, o carrito recién llegado
  // de WelcomeScreen/PriceCheck sin ninguna interacción con el backend aún)
  const calculateClientSideTotal = (
    prods: Product[],
    qtys: ProductQuantities,
  ) =>
    prods.reduce((total, product) => {
      if (product.total !== undefined) {
        return total + product.total;
      }
      const quantity = qtys[product.cod_barra] || 1;
      return total + product.precio * quantity;
    }, 0);

  // Proceder al pago (usa refs para evitar closure stale en callbacks del WebSocket)
  const proceedToPayment = useCallback(() => {
    const currentProducts = productsRef.current;
    const currentQuantities = productQuantitiesRef.current;

    const totalAmount =
      totalVentaRef.current ??
      calculateClientSideTotal(currentProducts, currentQuantities);

    console.log("💰 Total calculado en proceedToPayment:", totalAmount);
    console.log("💰 Products:", currentProducts);
    console.log("💰 ProductQuantities:", currentQuantities);

    // Avisarle a la cámara qué se está por cobrar. Va sin await a propósito:
    // el veredicto se muestra en la pantalla de visión, no acá, y la venta no
    // puede quedar esperando a una máquina que puede estar apagada.
    // Este es el único punto por el que pasan los dos botones de pagar.
    VisionService.check(currentProducts.map((p) => p.cod_barra));

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
    stableReadingConfirmRef.current = null;
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
    // Compra abandonada: soltar la cámara. Si no, el modelo se queda cargado
    // hasta la próxima venta y la canasta arrastra productos de un cliente que
    // ya se fue.
    VisionService.cerrar();

    try {
      // abandonSale y no clearCart: si el carrito llegó a confirmarse, vaciarlo
      // no alcanza — la compra ya existe del otro lado y hay que soltarla.
      await saleBackend.abandonSale();
      console.log("✅ Compra abandonada y carrito limpiado en el servidor");
    } catch (error) {
      console.error("❌ Error al limpiar el carrito:", error);
      // Continuar con la cancelación aunque falle el request
    }

    // Limpiar estado local
    setProducts([]);
    setProductQuantities({});
    setTotalVenta(null);
    // Limpiar sessionStorage
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    sessionStorage.removeItem(CAPASU_SESSION_KEY);
    setIsCancelling(false);
    navigate("/menu");
  };

  // Handler del botón de eliminar de cada fila: llama a la API para quitar el
  // producto del ticket y lo borra del estado local. Para pesables se identifica
  // por código interno (estable) y se resta el peso acumulado en el carrito;
  // para no pesables se identifica por cod_barra y se resta la cantidad
  const handleDeleteProduct = async (productId: string) => {
    const product = productsRef.current.find((p) => p.cod_barra === productId);
    if (!product) return;

    // Con ticket vivo hay que descontar la línea en el servidor antes de
    // sacarla de la pantalla; con carrito local todavía no existe allá.
    if (saleBackend.usesLiveTicket) {
      const scanValue = product.es_pesable ? (product.codigo || product.cod_barra) : productId;
      const amountToRemove = product.es_pesable
        ? -(product.peso || 0)
        : -(product.cantidad ?? productQuantitiesRef.current[productId] ?? 1);

      try {
        const response = await HttpClient.post<ScannedProduct>(ARCHI_ENDPOINTS.scanProducto, {
          scan: scanValue,
          cantidad_a_insertar: amountToRemove,
        });

        // Total real del ticket según el backend (Pegasus)
        setTotalVenta(response.total_venta);
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        if (error instanceof ApiError) {
          showAlert(t("saleScreen.errorWithMessage", { message: error.message }));
        } else {
          showAlert(t("saleScreen.deleteProductErrorGeneric"));
        }
        return;
      }
    }

    setProducts((prev) =>
      prev.filter((p) => p.cod_barra !== productId),
    );
    setProductQuantities((prev) => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  const handleIncrementQuantity = async (productId: string) => {
    // Sin ticket vivo el carrito es local: mover el estado ya es todo el cambio.
    if (!saleBackend.usesLiveTicket) {
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] || 1) + 1,
      }));
      return;
    }

    try {
      const response = await HttpClient.post<ScannedProduct>(ARCHI_ENDPOINTS.scanProducto, {
        scan: productId,
        cantidad_a_insertar: 1,
      });

      // Total real del ticket según el backend (Pegasus)
      setTotalVenta(response.total_venta);

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
        showAlert(t("saleScreen.errorWithMessage", { message: error.message }));
      } else {
        showAlert(t("saleScreen.incrementErrorGeneric"));
      }
    }
  };

  const handleDecrementQuantity = async (productId: string) => {
    // Igual que al incrementar, pero sin bajar de 1: quitar la línea entera es
    // lo que hace el botón de eliminar, y hacerlo también acá sorprendería.
    if (!saleBackend.usesLiveTicket) {
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: Math.max((prev[productId] || 1) - 1, 1),
      }));
      return;
    }

    try {
      const response = await HttpClient.post<ScannedProduct>(ARCHI_ENDPOINTS.scanProducto, {
        scan: productId,
        cantidad_a_insertar: -1,
      });

      // Total real del ticket según el backend (Pegasus)
      setTotalVenta(response.total_venta);

      if (response.cantidad <= 0) {
        // El backend eliminó la línea (cantidad llegó a 0) → sacarla de la lista
        setProducts((prev) => prev.filter((p) => p.cod_barra !== productId));
        setProductQuantities((prev) => {
          const newQuantities = { ...prev };
          delete newQuantities[productId];
          return newQuantities;
        });
        return;
      }

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
        [productId]: Math.max((prev[productId] || 1) - 1, 1),
      }));
    } catch (error) {
      console.error("Error al decrementar cantidad:", error);
      if (error instanceof ApiError) {
        showAlert(t("saleScreen.errorWithMessage", { message: error.message }));
      } else {
        showAlert(t("saleScreen.decrementErrorGeneric"));
      }
    }
  };

  const handleConfirmClear = async () => {
    setIsCancelling(true);
    setShowClearModal(false);
    try {
      await saleBackend.clearCart();
      console.log("✅ Carrito limpiado en el servidor");
    } catch (error) {
      console.error("❌ Error al limpiar el carrito:", error);
    }
    setProducts([]);
    setProductQuantities({});
    setTotalVenta(null);
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    sessionStorage.removeItem(CAPASU_SESSION_KEY);
    setIsCancelling(false);
  };

  return (
    <div className="h-screen bg-secondary-100 flex flex-col p-2 md:p-3 lg:p-4 xl:p-7 overflow-hidden">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-2 md:p-2 lg:p-3 xl:p-5 mb-1 md:mb-2 lg:mb-3 xl:mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Logo achicado */}
            <img src={marketLogo} alt="POSsible market" className="h-auto w-16 md:w-20 lg:w-28 xl:w-48" />
            {/* Nombre del cliente */}
            <span className="text-sm md:text-base lg:text-lg xl:text-2xl font-medium text-primary-600">
              {userName}
            </span>
          </div>
          {/* Instrucción destacada */}
          <p className="text-base md:text-lg lg:text-2xl xl:text-5xl font-bold text-primary-600 text-center mt-1 md:mt-2 lg:mt-3 xl:mt-4 animate-pulse">
            {t("saleScreen.scanToAddPrompt")}
          </p>
        </div>

        {/* Products List */}
        <div className="flex-1 min-h-0 mb-1 md:mb-2 lg:mb-3 xl:mb-6 overflow-y-auto bg-primary-50 rounded-lg shadow-inner relative">
          {/* Logo de fondo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={marketLogo}
              alt=""
              className="w-1/2 max-w-md opacity-10"
            />
          </div>
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-primary-600 text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold">
                  {t("saleScreen.emptyListLine1")}<br />{t("saleScreen.emptyListLine2")}
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
                    {t("common.producto")}
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-36">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    {t("common.cantidad")}
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    {t("common.precio")}
                  </div>
                </div>
                <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
                  <div className="text-xs md:text-sm lg:text-sm xl:text-lg font-bold text-gray-700 uppercase tracking-wide">
                    {t("common.subTotal")}
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 md:w-9 lg:w-10 xl:w-14"></div>
              </div>

              {/* Products */}
              <div className="space-y-1 md:space-y-2 lg:space-y-2 xl:space-y-4">
                {products.map((product, index) => (
                  <ProductItem
                    key={product.codigo || product.cod_barra || index}
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
                {t("saleScreen.totalToPayColon")}
              </div>
              <div className="text-base md:text-lg lg:text-xl xl:text-5xl font-bold text-primary-600">
                ₲
                {(
                  totalVenta ??
                  calculateClientSideTotal(products, productQuantities)
                ).toLocaleString("es-PY")}
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
                  {t("saleScreen.codeLabel", { code: errorProductBarcode })}
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
            {isInsertingProducts ? t("saleScreen.processing") : t("saleScreen.pay")}
          </button>

          <button
            onClick={handleCancelar}
            disabled={isCancelling}
            className="w-full bg-gray-300 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 py-3 md:py-4 lg:py-5 xl:py-11 rounded-lg text-lg md:text-xl lg:text-2xl xl:text-4xl font-semibold transition-colors duration-200"
          >
            {t("saleScreen.cancel")}
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
            <h2 className="text-xl xl:text-3xl font-bold text-gray-900 text-center">{t("saleScreen.clearListTitle")}</h2>
            <p className="text-gray-600 xl:text-xl text-center">{t("saleScreen.clearListBody")}</p>
            <div className="flex gap-3 xl:gap-4 w-full mt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 xl:py-5 rounded-xl text-base xl:text-2xl font-semibold transition-colors"
              >
                {t("common.cancelar")}
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 xl:py-5 rounded-xl text-base xl:text-2xl font-semibold transition-colors"
              >
                {t("common.confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isCancelling && (
        <div className="fixed inset-0 bg-white/80 flex flex-col items-center justify-center z-50">
          <img
            src={caritaPosible}
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
                  {t("saleScreen.placeProductsOnScale")}
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-600 mb-3 md:mb-4 lg:mb-5 xl:mb-6 text-center">
                  {weightValidationStatus === "error"
                    ? t("saleScreen.placeAllProducts")
                    : weightValidationStatus === "validating"
                    ? t("saleScreen.queryingWeight")
                    : t("saleScreen.waitingStableWeight")}
                </p>

                {/* Logo girando */}
                <img
                  src={caritaPosible}
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
                  {t("saleScreen.weightVerified")}
                </h2>

                <p className="text-sm md:text-base lg:text-lg xl:text-2xl text-gray-500">
                  {t("saleScreen.continueScanning")}
                </p>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
