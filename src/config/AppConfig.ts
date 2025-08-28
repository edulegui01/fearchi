/**
 * Clase estática para configuración de la aplicación
 * Centraliza todas las configuraciones y constantes
 */
class AppConfig {
  // Configuración de API
  static readonly API = {
    BASE_URL: 'http://localhost:3000',
    VERSION: 'v1',
    ENDPOINTS: {
      PRODUCTS: '/products',
      USERS: '/users',
      AUTH: '/auth',
    },
    TIMEOUT: 10000, // 10 segundos
  } as const;

  // Configuración de WebSocket
  static readonly SOCKET = {
    URL: 'ws://localhost:8080',
    MAIN_URL: 'http://localhost:3000', // Socket principal
    SCALE_URL: 'http://localhost:6', // Socket para balanza - Puerto 6
    RECONNECT_INTERVAL: 3000, // 3 segundos
    MAX_RECONNECT_ATTEMPTS: 5,
    HEARTBEAT_INTERVAL: 30000, // 30 segundos
    EVENTS: {
      CONNECT: 'connect',
      DISCONNECT: 'disconnect',
      ERROR: 'error',
      PRODUCTS_UPDATE: 'product-update',
      SCALE_DATA: 'scale-data',
      SCALE_WEIGHT: 'weight-update',
      SCALE_STATUS: 'scale-status',
      PAYMENT_STATUS: 'payment_status',
    },
  } as const;

  // Configuración de la aplicación
  static readonly APP = {
    NAME: 'POSsible-SCO',
    VERSION: '1.0.0',
    DESCRIPTION: 'Sistema de Control de Inventario',
    AUTHOR: 'Tu Empresa',
  } as const;

  // Configuración de paginación
  static readonly PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  } as const;

  // Configuración de autenticación
  static readonly AUTH = {
    TOKEN_KEY: 'authToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    USER_KEY: 'userData',
    SESSION_TIMEOUT: 3600000, // 1 hora en ms
  } as const;

  // Configuración de validaciones
  static readonly VALIDATION = {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_PRICE: 999999.99,
    MAX_STOCK: 99999,
  } as const;

  // URLs completas de la API
  static getApiUrl(endpoint: string = ''): string {
    return `${this.API.BASE_URL}/api/${this.API.VERSION}${endpoint}`;
  }

  // URL específica para productos
  static get PRODUCTS_API_URL(): string {
    return this.getApiUrl(this.API.ENDPOINTS.PRODUCTS);
  }

  // URL específica para usuarios
  static get USERS_API_URL(): string {
    return this.getApiUrl(this.API.ENDPOINTS.USERS);
  }

  // URL específica para autenticación
  static get AUTH_API_URL(): string {
    return this.getApiUrl(this.API.ENDPOINTS.AUTH);
  }

  // URL específica para WebSocket
  static get SOCKET_URL(): string {
    return this.SOCKET.URL;
  }

  // Configuración de desarrollo/producción
  static readonly ENV = {
    IS_DEVELOPMENT: window.location.hostname === 'localhost',
    IS_PRODUCTION: window.location.hostname !== 'localhost',
  } as const;

  // Headers por defecto para peticiones
  static getDefaultHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = localStorage.getItem(this.AUTH.TOKEN_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Configuración de formato
  static readonly FORMAT = {
    CURRENCY: 'USD',
    LOCALE: 'es-ES',
    DATE_FORMAT: 'dd/MM/yyyy',
    DATETIME_FORMAT: 'dd/MM/yyyy HH:mm',
  } as const;

  // Métodos utilitarios
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.FORMAT.LOCALE, {
      style: 'currency',
      currency: this.FORMAT.CURRENCY,
    }).format(amount);
  }

  static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(this.FORMAT.LOCALE);
  }

  static formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString(this.FORMAT.LOCALE);
  }

  // Log de configuración (solo en desarrollo)
  static logConfig(): void {
    if (this.ENV.IS_DEVELOPMENT) {
      console.group('🔧 App Configuration');
      console.log('API Base URL:', this.API.BASE_URL);
      console.log('App Name:', this.APP.NAME);
      console.log('Version:', this.APP.VERSION);
      console.log('Environment:', this.ENV.IS_DEVELOPMENT ? 'Development' : 'Production');
      console.groupEnd();
    }
  }
}

export default AppConfig;