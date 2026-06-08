import { useState } from 'react';
import type { ProductItemProps } from '../../types';

export default function ProductItem({
  product,
  index: _index,
  quantity = 1,
  onDelete,
  onIncrement,
  onDecrement
}: ProductItemProps) {
  const [isIncrementing, setIsIncrementing] = useState(false);
  const subtotal = product.total ?? product.precio * quantity;
  console.log('Product name:', product.name, 'Descripcion:', product.descripcion);

  const handleDelete = () => {
    onDelete?.(product.cod_barra);
  };

  const handleIncrement = async () => {
    if (isIncrementing) return;
    setIsIncrementing(true);
    try {
      await onIncrement?.(product.cod_barra);
    } finally {
      setIsIncrementing(false);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onDecrement?.(product.cod_barra);
    }
  };

  return (
    <div className="bg-white rounded-lg xl:rounded-xl shadow-md xl:shadow-lg border border-gray-200 p-2 md:p-3 lg:p-4 xl:p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center gap-2 md:gap-3 lg:gap-4 xl:gap-8">
        {/* Product Image and Code */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 xl:w-24 xl:h-24 bg-gray-100 rounded-lg xl:rounded-xl flex items-center justify-center overflow-hidden">
            {product.imagen ? (
              <img
                src={product.imagen || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg xl:rounded-xl"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const nextElement = img.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.classList.remove("hidden");
                  }
                }}
              />
            ) : (
              <div className="text-gray-400 text-[8px] md:text-[10px] lg:text-xs xl:text-sm text-center">Sin imagen</div>
            )}
          </div>
          <div className="text-[8px] md:text-[10px] lg:text-xs xl:text-sm text-gray-500 text-center mt-0.5 md:mt-1 xl:mt-2 truncate w-10 md:w-12 lg:w-16 xl:w-24 font-mono">{product.cod_barra}</div>
        </div>

        {/* Product Info - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3 mb-0.5 md:mb-1 xl:mb-2">
            <h3
              className="font-bold text-gray-900 text-xs md:text-sm lg:text-base xl:text-2xl line-clamp-2"
              title={product.descripcion}
            >
              {product.descripcion}
            </h3>
          </div>
          <p className="text-gray-600 text-[10px] md:text-xs lg:text-sm xl:text-lg line-clamp-1 xl:line-clamp-2">{product.name || ''}</p>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-36 gap-1 md:gap-1.5 xl:gap-2">
          {product.es_pesable ? (
            <div className="text-sm md:text-base lg:text-xl xl:text-3xl font-bold text-gray-600 bg-gray-50 rounded md:rounded-lg py-0.5 md:py-1 xl:py-2 w-full text-center">
              {product.peso}g
            </div>
          ) : (
            <>
              <button
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-10 xl:h-10 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-gray-700 rounded md:rounded-lg text-xs md:text-sm lg:text-base xl:text-2xl font-bold transition-colors duration-200 flex items-center justify-center"
              >
                −
              </button>
              <div className="text-sm md:text-base lg:text-xl xl:text-3xl font-bold text-gray-600 bg-gray-50 rounded md:rounded-lg py-0.5 md:py-1 xl:py-2 w-6 md:w-8 lg:w-10 xl:w-16 text-center">{quantity}</div>
              <button
                onClick={handleIncrement}
                disabled={isIncrementing}
                className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-10 xl:h-10 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded md:rounded-lg text-xs md:text-sm lg:text-base xl:text-2xl font-bold transition-colors duration-200 flex items-center justify-center"
              >
                {isIncrementing ? "..." : "+"}
              </button>
            </>
          )}
        </div>

        {/* Price */}
        <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
          <div className="text-xs md:text-sm lg:text-lg xl:text-3xl font-bold text-gray-400 bg-gray-50 rounded md:rounded-lg py-0.5 md:py-1 xl:py-2">₲{product.precio.toLocaleString('es-PY')}</div>
        </div>

        {/* Total */}
        <div className="text-center flex-shrink-0 w-16 md:w-20 lg:w-24 xl:w-32">
          <div className="text-xs md:text-sm lg:text-lg xl:text-3xl font-bold text-black-600 bg-green-50 rounded md:rounded-lg py-0.5 md:py-1 xl:py-2">₲{subtotal.toLocaleString('es-PY')}</div>
        </div>

        {/* Delete Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-14 xl:h-14 bg-red-500 hover:bg-red-600 text-white rounded-lg xl:rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-105 shadow-md xl:shadow-lg"
            title="Eliminar producto"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-7 xl:h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}