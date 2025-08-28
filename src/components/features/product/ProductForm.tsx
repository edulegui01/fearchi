import { useState, useEffect } from 'react';

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

interface ProductFormProps {
  product?: Product | null;
  onSave?: (productData: Omit<Product, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  isVisible?: boolean;
}

const categoryOptions = [
  { value: 'Electrónicos', label: 'Electrónicos' },
  { value: 'Muebles', label: 'Muebles' },
  { value: 'Ropa', label: 'Ropa' },
  { value: 'Deportes', label: 'Deportes' },
  { value: 'Hogar', label: 'Hogar' },
  { value: 'Libros', label: 'Libros' },
  { value: 'Juguetes', label: 'Juguetes' },
];

export default function ProductForm({ 
  product, 
  onSave, 
  onCancel, 
  isVisible = false 
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Electrónicos',
    stock: 0,
    status: 'active' as 'active' | 'inactive',
  });

  const [errors, setErrors] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        status: product.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'Electrónicos',
        stock: 0,
        status: 'active',
      });
    }
    setErrors({ name: '', description: '', price: '', category: '', stock: '' });
  }, [product, isVisible]);

  const validateForm = () => {
    const newErrors = {
      name: '',
      description: '',
      price: '',
      category: '',
      stock: '',
    };

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar descripción
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }

    // Validar precio
    if (formData.price <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    } else if (formData.price > 999999) {
      newErrors.price = 'El precio no puede exceder $999,999';
    }

    // Validar categoría
    if (!formData.category) {
      newErrors.category = 'Debe seleccionar una categoría';
    }

    // Validar stock
    if (formData.stock < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    } else if (formData.stock > 99999) {
      newErrors.stock = 'El stock no puede exceder 99,999 unidades';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    // Simular delay de API
    setTimeout(() => {
      onSave?.(formData);
      setIsLoading(false);
    }, 1000);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | 'active' | 'inactive') => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'Electrónicos',
      stock: 0,
      status: 'active',
    });
    setErrors({ name: '', description: '', price: '', category: '', stock: '' });
    onCancel?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Ingresa el nombre del producto"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
                errors.description 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Describe las características principales del producto"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Precio y Stock en fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Precio */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="price"
                  step="0.01"
                  min="0"
                  max="999999"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.price 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>

            {/* Stock */}
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock *
              </label>
              <input
                type="number"
                id="stock"
                min="0"
                max="99999"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.stock 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
                placeholder="0"
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.category 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
            >
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value as 'active')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Activo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={(e) => handleInputChange('status', e.target.value as 'inactive')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Inactivo</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Guardando...' : (product ? 'Actualizar' : 'Crear Producto')}
          </button>
        </div>
      </div>
    </div>
  );
}