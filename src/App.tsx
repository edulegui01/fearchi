import AppRouter from './components/common/AppRouter';
import './App.css';

function App() {
  return (
    <AppRouter 
      logoText="POSsible-SCO"
      userName="Juan Pérez"
      userEmail="juan@empresa.com"
      onLogout={() => console.log('Cerrando sesión...')}
    />
  );
}

export default App
