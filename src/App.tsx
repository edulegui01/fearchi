import AppRouter from './components/common/AppRouter';
import { LoadingProvider } from './components/common/LoadingContext';
import { AlertProvider } from './components/common/AlertContext';
import './App.css';

function App() {
  return (
    <AlertProvider>
      <LoadingProvider>
        <AppRouter
          logoText="POSsible-SCO"
          userName="Usuario"
          userEmail="usuario@ejemplo.com"
          onLogout={() => console.log('Cerrando sesión...')}
        />
      </LoadingProvider>
    </AlertProvider>
  );
}

export default App
