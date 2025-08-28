import AppConfig from '../config/AppConfig';
import { ApiError } from './ApiError';

/**
 * Cliente HTTP centralizado para todas las peticiones de la aplicación
 * Maneja automáticamente headers, autenticación y errores
 */
export class HttpClient {
  private static timeout = AppConfig.API.TIMEOUT;

  /**
   * Realiza una petición HTTP con configuración automática
   */
  private static async request(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: HeadersInit = {
        ...AppConfig.getDefaultHeaders(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await ApiError.fromResponse(response, url);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout', 'Request Timeout', url);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(url: string): Promise<T> {
    try {
      const response = await this.request(url, { method: 'GET' });
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  static async post<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.request(url, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * PUT request
   */
  static async put<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.request(url, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      });
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  static async patch<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.request(url, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      });
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(url: string): Promise<T | void> {
    try {
      const response = await this.request(url, { method: 'DELETE' });
      
      // Algunos endpoints DELETE no devuelven contenido
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * Upload de archivos (FormData)
   */
  static async upload<T = any>(url: string, formData: FormData): Promise<T> {
    try {
      // Para uploads, no incluir Content-Type header (fetch lo maneja automáticamente)
      const headers = AppConfig.getDefaultHeaders();
      delete (headers as any)['Content-Type'];

      const response = await this.request(url, {
        method: 'POST',
        body: formData,
        headers,
      });

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        error.log();
      }
      throw error;
    }
  }

  /**
   * Configurar timeout personalizado
   */
  static setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Obtener timeout actual
   */
  static getTimeout(): number {
    return this.timeout;
  }
}

export default HttpClient;