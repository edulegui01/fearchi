import HttpClient from '../../utils/httpClient';
import type { ApiProduct, CreateProductDto, UpdateProductDto, ProductFilters, ProductResponse, ScannedProduct, Product } from '../../types';

// Clase principal del servicio de productos
class ProductService {
  /**
   * Obtener todos los productos con filtros opcionales
   * @param filters - Filtros para la b�squeda
   * @returns Promise con la lista de productos
   */
  static async getProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      const url = `${baseUrl}?${queryParams.toString()}`;
      return await HttpClient.get<ProductResponse>(url);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Obtener un producto por ID
   * @param id - ID del producto
   * @returns Promise con el producto
   */
  static async getProductById(id: string): Promise<ApiProduct> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      return await HttpClient.get<ApiProduct>(`${baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crear un nuevo producto
   * @param productData - Datos del producto a crear
   * @returns Promise con el producto creado
   */
  static async createProduct(productData: CreateProductDto): Promise<ApiProduct> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      return await HttpClient.post<ApiProduct>(baseUrl, productData);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Actualizar un producto existente
   * @param id - ID del producto a actualizar
   * @param productData - Datos a actualizar
   * @returns Promise con el producto actualizado
   */
  static async updateProduct(id: string, productData: UpdateProductDto): Promise<ApiProduct> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      return await HttpClient.put<ApiProduct>(`${baseUrl}/${id}`, productData);
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualizaci�n parcial de un producto
   * @param id - ID del producto a actualizar
   * @param productData - Datos a actualizar parcialmente
   * @returns Promise con el producto actualizado
   */
  static async patchProduct(id: string, productData: Partial<UpdateProductDto>): Promise<ApiProduct> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      return await HttpClient.patch<ApiProduct>(`${baseUrl}/${id}`, productData);
    } catch (error) {
      console.error(`Error patching product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar un producto
   * @param id - ID del producto a eliminar
   * @returns Promise que se resuelve cuando se elimina
   */
  static async deleteProduct(id: string): Promise<void> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/${import.meta.env.VITE_API_VERSION}/products`;
      await HttpClient.delete<void>(`${baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar el stock de un producto
   * @param id - ID del producto
   * @param stock - Nuevo valor de stock
   * @returns Promise con el producto actualizado
   */
  static async updateStock(id: string, stock: number): Promise<ApiProduct> {
    try {
      return await this.patchProduct(id, { stock });
    } catch (error) {
      console.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cambiar el estado de un producto (activo/inactivo)
   * @param id - ID del producto
   * @param status - Nuevo estado
   * @returns Promise con el producto actualizado
   */
  static async updateStatus(id: string, status: 'active' | 'inactive'): Promise<ApiProduct> {
    try {
      return await this.patchProduct(id, { status });
    } catch (error) {
      console.error(`Error updating status for product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtener productos por categor�a
   * @param category - Categor�a de productos
   * @returns Promise con la lista de productos
   */
  static async getProductsByCategory(category: string): Promise<ApiProduct[]> {
    try {
      const response = await this.getProducts({ category });
      return response.products;
    } catch (error) {
      console.error(`Error fetching products by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Buscar productos por nombre o descripci�n
   * @param searchTerm - T�rmino de b�squeda
   * @returns Promise con la lista de productos
   */
  static async searchProducts(searchTerm: string): Promise<ApiProduct[]> {
    try {
      const response = await this.getProducts({ search: searchTerm });
      return response.products;
    } catch (error) {
      console.error(`Error searching products with term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Obtener producto por código de barras desde el escáner
   * @param barcode - Código de barras del producto
   * @param cantidad - Cantidad del producto (default: 1)
   * @returns Promise con el producto escaneado o null si no se encuentra
   * @throws ApiError con información detallada del error si es 404 o cualquier otro error
   */
  static async getProductByBarcode(barcode: string, cantidad: number = 1): Promise<ScannedProduct | null> {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const url = `${baseUrl}/pos/productos/scan`;
      return await HttpClient.post<ScannedProduct>(url, {
        scan: barcode,
        cantidad
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener producto por código de barras desde la API de productos
   * Usado por VerticalProductPage y WelcomeScreen
   * @param barcode - Código de barras del producto
   * @returns Promise con el producto o null si no se encuentra
   */
  static async getProductByBarcodeApi(barcode: string): Promise<Product | null> {
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`;
      const url = `${baseUrl}/api/product/${barcode}`;
      return await HttpClient.get<Product>(url);
    } catch (error) {
      throw error;
    }
  }
}

export default ProductService;