import AppRouter from './components/common/AppRouter';
import { LoadingProvider } from './components/common/LoadingContext';
import { AlertProvider } from './components/common/AlertContext';
import { LanguageProvider } from './components/common/LanguageContext';
import './App.css';

function App() {
  return (
    <AlertProvider>
      <LoadingProvider>
        <LanguageProvider>
          <AppRouter
            logoText="POSsible-SCO"
            userName="Usuario"
            userEmail="usuario@ejemplo.com"
            onLogout={() => console.log('Cerrando sesión...')}
          />
        </LanguageProvider>
      </LoadingProvider>
    </AlertProvider>
  );
}

export default App
