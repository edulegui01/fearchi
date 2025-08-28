import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import UserPage from '../pages/UserPage';
import ProductPage from '../pages/ProductPage';
import VerticalProductPage from '../pages/VerticalProductPage';
import PaymentPage from '../pages/PaymentPage';
import WelcomeScreen from '../components/WelcomeScreen';
import LoginPage from '../pages/LoginPage';

interface AppRouterProps {
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

function AppContent({ logoText, logoImage, userName, userEmail, onLogout }: AppRouterProps) {
  const navigate = useNavigate();

  const handleModuleClick = (moduleId: string) => {
    console.log('Navegando a:', moduleId);
    
    switch (moduleId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'users':
        navigate('/users');
        break;
      case 'products':
        navigate('/products');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={<Navigate to="/login" replace />} 
      />
      
      <Route 
        path="/login" 
        element={
          <LoginPage 
            onLogin={(email, password) => {
              console.log('Login attempt:', email, password);
              // Aquí puedes agregar lógica de autenticación
              // Por ahora, redirigir al dashboard después del login
              navigate('/dashboard');
            }}
          />
        } 
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

      <Route 
        path="/welcome" 
        element={<WelcomeScreen />} 
      />

      <Route 
        path="/payment" 
        element={
          <PaymentPage 
            products={[]}
            totalAmount={0}
            onPaymentSuccess={() => navigate('/dashboard')}
            onCancel={() => navigate('/vertical-products')}
          />
        } 
      />

      {/* 404 - Ruta no encontrada */}
      <Route 
        path="*" 
        element={<Navigate to="/dashboard" replace />} 
      />
    </Routes>
  );
}

export default function AppRouter(props: AppRouterProps) {
  return (
    <BrowserRouter>
      <AppContent {...props} />
    </BrowserRouter>
  );
}