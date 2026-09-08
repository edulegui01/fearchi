import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import UserPage from "../pages/UserPage";
import ProductPage from "../pages/ProductPage";
import VerticalProductPage from "../pages/VerticalProductPage";
import PaymentPage from "../pages/PaymentPage";
import TestPage from "../pages/TestPage";
import WelcomeScreen from "../components/WelcomeScreen";
import WelcomeScreen2 from "../components/WelcomeScreen2";
import LoginPage from "../pages/LoginPage";
import MainMenuPage from "../pages/archi/MainMenuPage";
import PriceCheckPage from "../pages/archi/PriceCheckPage";
import InvoiceTypeSelectionPage from "../pages/archi/InvoiceTypeSelectionPage";
import BagSelectionPage from "../pages/archi/BagSelectionPage";
import SaleScreen from "../pages/archi/SaleScreen";
import SaleScreenModern from "../pages/archi/SaleScreenModern";
import PriceCheckPageModern from "../pages/archi/PriceCheckPageModern";
import PaymentSelectionPage from "../pages/archi/PaymentSelectionPage";
import { getSaleBackend } from "../../services/sale/SaleBackend";
import { useLoading } from "./LoadingContext";
import { InactivityProvider } from "./InactivityProvider";

interface AppRouterProps {
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

function AppContent({
  logoText,
  logoImage,
  userName,
  userEmail,
  onLogout,
}: AppRouterProps) {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  const handleIniciarCompra = async () => {
    try {
      showLoading();

      // Descartar lo que haya quedado de una compra anterior abandonada, o la
      // primera lectura de este cliente se suma a un carrito ajeno.
      await getSaleBackend().beginPurchase();
    } catch (error) {
      // Se sigue igual: dejar al cliente parado frente a la caja por una
      // limpieza fallida es peor que arrancar con un carrito sucio, que
      // además puede vaciar desde la propia pantalla de venta.
      console.error("Error al iniciar compra:", error);
    } finally {
      hideLoading();
      navigate("/invoice-type-selection");
    }
  };

  const handleModuleClick = (moduleId: string) => {
    console.log("Navegando a:", moduleId);

    switch (moduleId) {
      case "dashboard":
        navigate("/dashboard");
        break;
      case "users":
        navigate("/users");
        break;
      case "products":
        navigate("/products");
        break;
      default:
        navigate("/dashboard");
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={(email, password) => {
              console.log("Login attempt:", email, password);
              // Aquí puedes agregar lógica de autenticación
              // Por ahora, redirigir al dashboard después del login
              navigate("/dashboard");
            }}
          />
        }
      />

      <Route
        path="/menu"
        element={
          <MainMenuPage
            onIniciarCompra={handleIniciarCompra}
            onSalir={() => navigate("/login")}
          />
        }
      />

      <Route
        path="/invoice-type-selection"
        element={<InvoiceTypeSelectionPage />}
      />

      <Route
        path="/bag-selection"
        element={<BagSelectionPage />}
      />

      <Route
        path="/sale"
        element={<SaleScreen />}
      />

      <Route
        path="/sale-modern"
        element={<SaleScreenModern />}
      />

      <Route
        path="/payment-selection"
        element={<PaymentSelectionPage />}
      />

      <Route
        path="/price-check"
        element={
          <PriceCheckPage
            onBack={() => navigate("/menu")}
          />
        }
      />

      <Route
        path="/price-check-modern"
        element={<PriceCheckPageModern />}
      />

      <Route
        path="/dashboard"
        element={
          <DashboardPage
            logoText={logoText}
            logoImage={logoImage}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
            onModuleClick={handleModuleClick}
          />
        }
      />

      <Route
        path="/users"
        element={
          <UserPage
            logoText={logoText}
            logoImage={logoImage}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
            onModuleClick={handleModuleClick}
          />
        }
      />

      <Route
        path="/products"
        element={
          <ProductPage
            logoText={logoText}
            logoImage={logoImage}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
            onModuleClick={handleModuleClick}
          />
        }
      />

      {/* Terminal de Capasu: la compra la arma el colector, asi que la
          pantalla ya no recibe el usuario ni escanea nada. */}
      <Route path="/vertical-products" element={<VerticalProductPage />} />

      <Route path="/welcome" element={<WelcomeScreen />} />

      <Route path="/welcome2" element={<WelcomeScreen2 />} />

      <Route
        path="/payment"
        element={
          <PaymentPage />
        }
      />

      <Route path="/test" element={<TestPage />} />

      {/* 404 - Ruta no encontrada */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function AppRouter(props: AppRouterProps) {
  return (
    <BrowserRouter>
      <InactivityProvider>
        <AppContent {...props} />
      </InactivityProvider>
    </BrowserRouter>
  );
}
