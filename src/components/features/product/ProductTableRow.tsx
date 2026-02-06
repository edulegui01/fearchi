interface Product {
  id: number;
  barcode?: string;
  name?: string;
  description: string;
  price: string;
  category_id: number;
  image?: string;
  weight?: number;
  weighable: boolean;
  unit?: string;
  created_at: string;
  updated_at: string;
  sku?: string;
  purchase_price?: string;
  tax: string;
  stock: number;
  stock_min: number;
  active: boolean;
  category: {
    id: number;
    name: string;
    image?: string;
    created_at: string;
    updated_at: string;
  };
  image_url?: string;
}

interface ProductTableRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
}

export default function ProductTableRow({ product, onEdit, onDelete }: ProductTableRowProps) {
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

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactivo
      </span>
    );
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name || product.description}
                className="h-10 w-10 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.removeAttribute('style');
                }}
              />
            ) : null}
            <div 
              className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center"
              style={{ display: product.image_url ? 'none' : 'flex' }}
            >
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{product.name || product.description}</div>
            <div className="text-sm text-gray-500 line-clamp-2">{product.description}</div>
            {product.barcode && <div className="text-xs text-gray-400">Código: {product.barcode}</div>}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getCategoryBadge(product.category.name)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
        {parseInt(product.price).toLocaleString('es-PY')} Gs.
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-900">{product.stock}</span>
          {getStockBadge(product.stock)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(product.active)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <button
          onClick={() => onEdit(product)}
          className="text-primary-600 hover:text-primary-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="text-red-600 hover:text-red-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </td>
    </tr>
  );
}