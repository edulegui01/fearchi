/**
 * Clase personalizada para manejo de errores de API
 * Extiende la clase Error nativa con información adicional de HTTP
 */
export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public url?: string;
  public response?: any;

  constructor(
    status: number,
    message: string,
    statusText: string = '',
    url?: string,
    response?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.response = response;

    // Mantiene el stack trace correcto en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Crea un ApiError desde una respuesta fetch
   */
  static async fromResponse(response: Response, url?: string): Promise<ApiError> {
    let errorData: any = {};
    let message = `HTTP Error ${response.status}: ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        message = errorData.message || errorData.error || message;
      } else {
        const textData = await response.text();
        if (textData) {
          message = textData;
        }
      }
    } catch (parseError) {
      // Si no se puede parsear la respuesta, usar mensaje por defecto
      console.warn('Could not parse error response:', parseError);
    }

    return new ApiError(
      response.status,
      message,
      response.statusText,
      url || response.url,
      errorData
    );
  }

  /**
   * Determina si el error es de red/conectividad
   */
  get isNetworkError(): boolean {
    return this.status === 0 || this.message.includes('fetch');
  }

  /**
   * Determina si el error es de autenticación
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Determina si el error es del cliente (4xx)
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Determina si el error es del servidor (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  /**
   * Obtiene un mensaje amigable para el usuario
   */
  getUserFriendlyMessage(): string {
    switch (this.status) {
      case 400:
        return 'La solicitud contiene datos inválidos';
      case 401:
        return 'Necesitas iniciar sesión para continuar';
      case 403:
        return 'No tienes permisos para realizar esta acción';
      case 404:
        return 'El recurso solicitado no fue encontrado';
      case 409:
        return 'Ya existe un recurso con esos datos';
      case 422:
        return 'Los datos proporcionados no son válidos';
      case 429:
        return 'Has excedido el límite de solicitudes. Intenta más tarde';
      case 500:
        return 'Error interno del servidor. Intenta más tarde';
      case 502:
        return 'Servicio temporalmente no disponible';
      case 503:
        return 'Servicio en mantenimiento. Intenta más tarde';
      default:
        if (this.isNetworkError) {
          return 'Error de conexión. Verifica tu internet';
        }
        return this.message || 'Ha ocurrido un error inesperado';
    }
  }

  /**
   * Convierte el error a un objeto JSON para logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.statusText,
      url: this.url,
      stack: this.stack,
      response: this.response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Método para logging detallado del error
   */
  log(): void {
    console.group(`🚨 ${this.name} - Status ${this.status}`);
    console.error('Message:', this.message);
    console.error('URL:', this.url);
    console.error('Response:', this.response);
    console.error('Stack:', this.stack);
    console.groupEnd();
  }
}

/**
 * Tipos de errores comunes para mayor tipado
 */
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

export default ApiError;