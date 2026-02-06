import { useState, useEffect } from 'react';
import scoLogo from '../../assets/sco-logo.png';

interface WelcomeScreen2Props {
  onContinue?: () => void;
}

export default function WelcomeScreen2({ onContinue }: WelcomeScreen2Props) {
  const [userName, setUserName] = useState<string | null>(null);

  // Función para obtener userName desde sessionStorage
  const getUsername = () => {
    const sessionData = sessionStorage.getItem('currentOrder');
    if (sessionData) {
      const orderData = JSON.parse(sessionData);
      return orderData.userName;
    }
    return null;
  };

  useEffect(() => {
    // Actualizar userName inicial
    setUserName(getUsername());

    // Escuchar cambios en sessionStorage
    const handleStorageChange = () => {
      setUserName(getUsername());
    };

    window.addEventListener('storage', handleStorageChange);

    // Polling para detectar cambios en la misma pestaña
    const interval = setInterval(() => {
      const currentUserName = getUsername();
      setUserName(prevUserName => {
        if (prevUserName !== currentUserName) {
          return currentUserName;
        }
        return prevUserName;
      });
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-primary-400 flex items-center justify-center">
      <div className="flex flex-col items-center bg-primary-100 p-40 rounded-lg shadow-lg">
        <img 
          src={scoLogo} 
          alt="Fe-SCO"
          className="h-64 w-auto mb-6"
        />
        {userName && (
          <h2 className="text-4xl font-semibold text-primary-400 text-center mb-3">
            Hola {userName}
          </h2>
        )}
      </div>
    </div>
  );
}