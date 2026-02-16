import { useState, type ReactNode } from 'react';
import Header from '../sections/Header';
import Sidebar from '../sections/Sidebar';

interface LayoutProps {
  children: ReactNode;
  // Header props
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  // Sidebar props
  modules?: Array<{
    id: string;
    name: string;
    icon: string;
    path: string;
    badge?: number;
  }>;
  activeModule?: string;
  onModuleClick?: (moduleId: string) => void;
  // Layout props
  className?: string;
}

export default function Layout({
  children,
  logoText,
  logoImage,
  userName,
  userEmail,
  onLogout,
  modules,
  activeModule,
  onModuleClick,
  className = ''
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleModuleClick = (moduleId: string) => {
    onModuleClick?.(moduleId);
    // Cerrar menú móvil después de seleccionar un módulo
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex">
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          onModuleClick={handleModuleClick}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Sidebar - Mobile */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={toggleMobileMenu}
          />
          
          {/* Mobile Sidebar */}
          <div className="fixed inset-y-0 left-0 z-30 w-64 md:hidden">
            <Sidebar
              modules={modules}
              activeModule={activeModule}
              onModuleClick={handleModuleClick}
              isCollapsed={false}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="relative z-10">
          <Header
            logoText={logoText}
            logoImage={logoImage}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
          />
          
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto p-6 ${className}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}