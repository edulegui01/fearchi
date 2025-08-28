import { useState } from 'react';
import ProductForm from './ProductForm';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface ProductListProps {
  products?: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onAdd?: () => void;
}

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'Laptop Dell XPS 13',
    description: 'Laptop ultrabook con procesador Intel i7 y 16GB RAM',
    price: 1299.99,
    category: 'Electrónicos',
    stock: 25,
    status: 'active',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'iPhone 15 Pro',
    description: 'Smartphone Apple con cámara profesional',
    price: 1099.00,
    category: 'Electrónicos',
    stock: 42,
    status: 'active',
    createdAt: '2024-02-10'
  },
  {
    id: '3',
    name: 'Escritorio de Madera',
    description: 'Mesa de trabajo ergonómica en madera maciza',
    price: 450.50,
    category: 'Muebles',
    stock: 8,
    status: 'inactive',
    createdAt: '2024-01-28'
  },
  {
    id: '4',
    name: 'Monitor 4K Samsung',
    description: 'Monitor profesional 27" con resolución 4K',
    price: 799.99,
    category: 'Electrónicos',
    stock: 15,
    status: 'active',
    createdAt: '2024-03-05'
  },
  {
    id: '5',
    name: 'Silla Ergonómica',
    description: 'Silla de oficina con soporte lumbar ajustable',
    price: 320.00,
    category: 'Muebles',
    stock: 0,
    status: 'active',
    createdAt: '2024-02-20'
  }
];

export default function ProductList({
  products = defaultProducts,
  onEdit,
  onDelete,
  onAdd
}: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productList, setProductList] = useState<Product[]>(products);

  // Obtener categorías únicas
  const categories = Array.from(new Set(productList.map(product => product.category)));

  const filteredProducts = productList.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormVisible(true);
    onEdit?.(product);
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      setProductList(prev => prev.filter(product => product.id !== productId));
      onDelete?.(productId);
    }
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setIsFormVisible(true);
    onAdd?.();
  };

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'createdAt'>) => {
    if (selectedProduct) {
      // Editar producto existente
      setProductList(prev => prev.map(product => 
        product.id === selectedProduct.id 
          ? { ...product, ...productData }
          : product
      ));
    } else {
      // Crear nuevo producto
      const newProduct: Product = {
        id: (productList.length + 1).toString(),
        ...productData,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setProductList(prev => [...prev, newProduct]);
    }
    setIsFormVisible(false);
    setSelectedProduct(null);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setSelectedProduct(null);
  };

  const getStatusBadge = (status: Product['status']) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactivo
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      'Electrónicos': 'bg-blue-100 text-blue-800',
      'Muebles': 'bg-yellow-100 text-yellow-800',
      'Ropa': 'bg-purple-100 text-purple-800',
      'Deportes': 'bg-green-100 text-green-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[category] || 'bg-gray-100 text-gray-800'}`}>
        {category}
      </span>
    );
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Sin Stock
        </span>
      );
    } else if (stock <= 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Stock Bajo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          En Stock
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Gestiona el inventario de productos</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(product.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">{product.stock}</span>
                      {getStockBadge(product.stock)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(product.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-primary-600 hover:text-primary-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
            <p className="mt-1 text-sm text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredProducts.length} de {productList.length} productos
      </div>

      {/* Product Form Modal */}
      <ProductForm
        product={selectedProduct}
        isVisible={isFormVisible}
        onSave={handleSaveProduct}
        onCancel={handleCancelForm}
      />
    </div>
  );
}