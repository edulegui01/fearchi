import { useState } from 'react';
import scoLogo from '../../assets/sco-logo.png';

interface HeaderProps {
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export default function Header({ 
  logoText = "Fe-SCO", 
  logoImage,
  userName = "Usuario", 
  userEmail = "usuario@ejemplo.com",
  onLogout 
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout?.();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src={scoLogo} 
                alt={logoText}
                className="h-12 w-auto"
              />
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-gray-900 font-medium">{userName}</span>
                <span className="text-gray-500 text-xs">{userEmail}</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
                
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDropdownOpen(false);
                  }}
                >
                  Mi Perfil
                </a>
                
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDropdownOpen(false);
                  }}
                >
                  Configuración
                </a>
                
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </header>
  );
}