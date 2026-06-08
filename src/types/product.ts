// Tipos para productos - SCO App
export interface Product {
  cod_barra: string;
  descripcion: string;
  category_id: number;
  name: string;
  sku: string;
  imagen: string;
  precio: number;
  total?: number;
  total_venta?: number;
  cantidad?: number;
  peso: number;
  es_pesable: boolean;
  purchase_price: number;
  tax: number;
  stock: number;
  stock_min: number;
  active: boolean;
}

// Tipo para productos de la API externa
export interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  barcode?: string;
  createdAt: string;
  updatedAt?: string;
}

// DTOs para crear/actualizar productos
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

// Filtros para búsqueda de productos
export interface ProductFilters {
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

// Respuesta paginada de productos
export interface ProductResponse {
  products: ApiProduct[];
  total: number;
  page: number;
  totalPages: number;
}

// Cantidades de productos en el carrito
export interface ProductQuantities {
  [cod_barra: string]: number;
}

// Tipo para la respuesta del endpoint de scan
export interface ScannedProduct {
  codigo: string;
  codigo_barras: string;
  codigo_barra_int?: string;
  precio: number;
  total: number;
  descripcion: string;
  descripcion_producto?: string;
  descripcion_corta?: string;
  peso_gramos: string;
  es_pesable?: boolean;
  pesable?: number;
  nivel3?: number;
  cantidad: number;
  total_venta: number;
  imagen: string;
}

// Tipo para el error cuando un producto no se encuentra en el scan
export interface ProductNotFoundError {
  statusCode: 404;
  message: string;
  error: 'Product Not Found';
  identifier: string;
  searchType: 'codigo';
}