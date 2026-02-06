import { useState, useEffect } from 'react';

interface Product {
  id: string;
  barcode?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  category_id: string;
  stock: number;
  status: 'active' | 'inactive';
  createdAt: string;
  image_url?: string;
  weighable?: boolean;
  weight?: number;
}

interface ProductFormProps {
  product?: Product | null;
  onSave?: (productData: Omit<Product, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  isVisible?: boolean;
}

const categoryOptions = [
  { value: '1', label: 'productos' },
];

export default function ProductForm({ 
  product, 
  onSave, 
  onCancel, 
  isVisible = false 
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    description: '',
    price: 0,
    category_id: '1',
    stock: 0,
    status: 'active' as 'active' | 'inactive',
    weighable: false,
    weight: 0,
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    barcode: '',
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    image: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        barcode: product.barcode || '',
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        stock: product.stock,
        status: product.status,
        weighable: product.weighable || false,
        weight: product.weight || 0,
      });
      setImagePreview(product.image_url || null);
    } else {
      setFormData({
        barcode: '',
        name: '',
        description: '',
        price: 0,
        category_id: '1',
        stock: 0,
        status: 'active',
        weighable: false,
        weight: 0,
      });
      setImagePreview(null);
    }
    setSelectedImage(null);
    setErrors({ barcode: '', name: '', description: '', price: '', category_id: '', stock: '', image: '' });
  }, [product, isVisible]);

  const validateImage = (file: File): string => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de archivo no válido. Solo se permiten: JPEG, PNG, JPG, GIF, WEBP';
    }

    if (file.size > maxSize) {
      return 'El archivo es demasiado grande. Tamaño máximo: 2MB';
    }

    return '';
  };

  const processImageFile = (file: File) => {
    const validationError = validateImage(file);
    if (validationError) {
      setErrors(prev => ({ ...prev, image: validationError }));
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    setSelectedImage(file);
    setErrors(prev => ({ ...prev, image: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      setErrors(prev => ({ ...prev, image: '' }));
      return;
    }

    processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        setErrors(prev => ({ ...prev, image: 'Por favor, arrastra solo archivos de imagen' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {
      barcode: '',
      name: '',
      description: '',
      price: '',
      category_id: '',
      stock: '',
      image: '',
    };

    // Validar código de barras
    if (!formData.barcode.trim()) {
      newErrors.barcode = 'El código de barras es obligatorio';
    } else if (formData.barcode.trim().length < 3) {
      newErrors.barcode = 'El código de barras debe tener al menos 3 caracteres';
    }

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
    if (!formData.category_id) {
      newErrors.category_id = 'Debe seleccionar una categoría';
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('barcode', formData.barcode);
      formDataToSubmit.append('name', formData.name);
      formDataToSubmit.append('description', formData.description);
      formDataToSubmit.append('price', formData.price.toString());
      formDataToSubmit.append('category_id', formData.category_id);
      formDataToSubmit.append('stock', formData.stock.toString());
      formDataToSubmit.append('active', formData.status === 'active' ? '1' : '0');
      formDataToSubmit.append('weighable', formData.weighable ? '1' : '0');
      formDataToSubmit.append('weight', formData.weight.toString());
      formDataToSubmit.append('stock_min', '0');
      formDataToSubmit.append('tax', '0');
      
      if (selectedImage) {
        formDataToSubmit.append('image', selectedImage);
      }

      formDataToSubmit.forEach((value, key) => {
  console.log(key, value);
});

      const isEditing = !!product;
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api`;
      const url = isEditing
        ? `${baseUrl}/product/${product.id}/update`
        : `${baseUrl}/product`;

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formDataToSubmit
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Product ${isEditing ? 'updated' : 'created'} successfully:`, result);
        
        // Call onSave callback if provided (for parent component to handle success)
        onSave?.(result);
        
        // Reset form
        handleCancel();
      } else {
        const errorData = await response.json();
        console.error('Error creating product:', errorData);
        // Handle error (you might want to show an error message to the user)
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle network error
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | 'active' | 'inactive') => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCancel = () => {
    setFormData({
      barcode: '',
      name: '',
      description: '',
      price: 0,
      category_id: '1',
      stock: 0,
      status: 'active',
      weighable: false,
      weight: 0,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setErrors({ barcode: '', name: '', description: '', price: '', category_id: '', stock: '', image: '' });
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
          {/* Código de barras */}
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
              Código de barras *
            </label>
            <input
              type="text"
              id="barcode"
              value={formData.barcode}
              onChange={(e) => handleInputChange('barcode', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.barcode 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Ingresa el código de barras del producto"
            />
            {errors.barcode && (
              <p className="mt-1 text-sm text-red-600">{errors.barcode}</p>
            )}
          </div>

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
                  value={formData.price === 0 ? '' : formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
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
                value={formData.stock === 0 ? '' : formData.stock}
                onChange={(e) => handleInputChange('stock', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
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

          {/* Pesable y Peso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Checkbox Pesable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuración de peso
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="weighable"
                  checked={formData.weighable}
                  onChange={(e) => handleInputChange('weighable', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="weighable" className="ml-2 block text-sm text-gray-700">
                  Producto pesable
                </label>
              </div>
            </div>

            {/* Campo de Peso */}
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                Peso (gramos)
              </label>
              <input
                type="number"
                id="weight"
                min="0"
                step="0.001"
                value={formData.weight === 0 ? '' : formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Peso en gramos"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              id="category_id"
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.category_id 
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
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
            )}
          </div>

          {/* Imagen del producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen del producto
            </label>
            <div className="space-y-3">
              {/* Upload input */}
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="image-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-primary-500 bg-primary-50'
                      : errors.image 
                        ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className={`mb-1 text-sm ${isDragOver ? 'text-primary-600' : 'text-gray-500'}`}>
                      <span className="font-semibold">
                        {isDragOver ? 'Suelta la imagen aquí' : 'Hacer clic para subir'}
                      </span>
                      {!isDragOver && ' o arrastrar y soltar'}
                    </p>
                    <p className={`text-xs ${isDragOver ? 'text-primary-500' : 'text-gray-500'}`}>
                      PNG, JPG, JPEG, GIF, WEBP (MAX. 2MB)
                    </p>
                  </div>
                  <input 
                    id="image-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              
              {/* Preview */}
              {imagePreview && (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {errors.image && (
                <p className="text-sm text-red-600">{errors.image}</p>
              )}
            </div>
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