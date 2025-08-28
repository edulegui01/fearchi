// Tipos de datos para Product
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  stock?: number;
  status?: 'active' | 'inactive';
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

import AppConfig from '../../config/AppConfig';
import HttpClient from '../../utils/httpClient';

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

      const url = `${AppConfig.PRODUCTS_API_URL}?${queryParams.toString()}`;
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
  static async getProductById(id: string): Promise<Product> {
    try {
      return await HttpClient.get<Product>(`${AppConfig.PRODUCTS_API_URL}/${id}`);
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
  static async createProduct(productData: CreateProductDto): Promise<Product> {
    try {
      return await HttpClient.post<Product>(AppConfig.PRODUCTS_API_URL, productData);
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
  static async updateProduct(id: string, productData: UpdateProductDto): Promise<Product> {
    try {
      return await HttpClient.put<Product>(`${AppConfig.PRODUCTS_API_URL}/${id}`, productData);
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
  static async patchProduct(id: string, productData: Partial<UpdateProductDto>): Promise<Product> {
    try {
      return await HttpClient.patch<Product>(`${AppConfig.PRODUCTS_API_URL}/${id}`, productData);
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
      await HttpClient.delete<void>(`${AppConfig.PRODUCTS_API_URL}/${id}`);
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
  static async updateStock(id: string, stock: number): Promise<Product> {
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
  static async updateStatus(id: string, status: 'active' | 'inactive'): Promise<Product> {
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
  static async getProductsByCategory(category: string): Promise<Product[]> {
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
  static async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const response = await this.getProducts({ search: searchTerm });
      return response.products;
    } catch (error) {
      console.error(`Error searching products with term "${searchTerm}":`, error);
      throw error;
    }
  }
}

export default ProductService;