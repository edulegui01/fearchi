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
import HttpClient from "../../utils/httpClient";
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
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // Obtener el valor de caja desde el backend
      const configResponse = await HttpClient.get<{ caja: string }>(
        `${baseUrl}/caja-config/caja`
      );
      const caja = configResponse.caja;

      // Limpiar ticket antes de iniciar la compra
      await HttpClient.post(`${baseUrl}/pos/ventas-aut/ticket-clean`, {
        caja: Number(caja),
      });

      // Navegar a la selección de tipo de factura
      navigate("/invoice-type-selection");
    } catch (error) {
      console.error("Error al iniciar compra:", error);
      // En caso de error, navegar de todas formas
      navigate("/invoice-type-selection");
    } finally {
      hideLoading();
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
        element={<PaymentSelectionPage onBack={() => navigate("/sale")} />}
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

      <Route
        path="/vertical-products"
        element={<VerticalProductPage userName={userName} />}
      />

      <Route path="/welcome" element={<WelcomeScreen />} />

      <Route path="/welcome2" element={<WelcomeScreen2 />} />

      <Route
        path="/payment"
        element={
          <PaymentPage
            products={[]}
            totalAmount={0}
            onPaymentSuccess={() => navigate("/dashboard")}
            onCancel={() => navigate("/vertical-products")}
          />
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
