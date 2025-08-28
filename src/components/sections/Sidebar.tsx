import { useState } from 'react';
import { useLocation } from 'react-router-dom';

interface Module {
  id: string;
  name: string;
  icon: string;
  path: string;
  badge?: number;
}

interface SidebarProps {
  modules?: Module[];
  activeModule?: string;
  onModuleClick?: (moduleId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const defaultModules: Module[] = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊', path: '/dashboard' },
  { id: 'users', name: 'Usuarios', icon: '👥', path: '/users' },
  { id: 'products', name: 'Productos', icon: '📦', path: '/products' },
];

export default function Sidebar({
  modules = defaultModules,
  activeModule,
  onModuleClick,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const location = useLocation();

  // Determinar módulo activo basado en la ruta actual
  const getCurrentActiveModule = () => {
    if (activeModule) return activeModule;
    
    const path = location.pathname;
    const module = modules.find(m => m.path === path);
    return module?.id || 'dashboard';
  };

  const currentActiveModule = getCurrentActiveModule();

  const handleModuleClick = (moduleId: string) => {
    onModuleClick?.(moduleId);
  };

  return (
    <div className={`bg-secondary-900 text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-white">Módulos</h2>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-secondary-700 transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {modules.map((module) => {
          const isActive = currentActiveModule === module.id;
          const isHovered = hoveredModule === module.id;
          
          return (
            <div key={module.id} className="relative">
              <button
                onClick={() => handleModuleClick(module.id)}
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'hover:bg-secondary-700 text-secondary-300 hover:text-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{module.icon}</span>
                
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">
                      {module.name}
                    </span>
                    
                    {module.badge && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isActive 
                          ? 'bg-primary-800 text-primary-100' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {module.badge}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Tooltip para modo colapsado */}
              {isCollapsed && isHovered && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-50">
                  <div className="bg-secondary-800 text-white px-3 py-2 rounded-lg shadow-lg border border-secondary-600 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span>{module.name}</span>
                      {module.badge && (
                        <span className="px-2 py-1 text-xs bg-red-500 rounded-full">
                          {module.badge}
                        </span>
                      )}
                    </div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-secondary-800 rotate-45 border-l border-b border-secondary-600"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-secondary-700">
        {!isCollapsed ? (
          <div className="text-xs text-secondary-400 text-center">
            Fe-SCO v1.0.0
          </div>
        ) : (
          <div className="text-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}