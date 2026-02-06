import type { ProductItemProps } from '../../types';

export default function ProductItemModern({
  product,
  index,
  quantity = 1,
  onDelete
}: ProductItemProps) {
  const total = product.precio * quantity;

  const handleDelete = () => {
    onDelete?.(product.cod_barra);
  };

  return (
    <div
      className="group relative bg-gradient-to-br from-white to-gray-50 rounded-lg lg:rounded-xl xl:rounded-2xl shadow-md border border-gray-100 lg:border-2 hover:border-primary-300 hover:shadow-2xl transition-all duration-300 overflow-hidden animate-slideIn"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Decorative gradient bar on top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 lg:h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>

      <div className="p-2 md:p-3 lg:p-4 xl:p-6">
        <div className="flex items-start gap-2 md:gap-3 lg:gap-4 xl:gap-6">
          {/* Product Image with Badge */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-32 xl:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg lg:rounded-xl xl:rounded-2xl flex items-center justify-center overflow-hidden shadow-inner ring-2 lg:ring-4 ring-white group-hover:ring-primary-100 transition-all duration-300">
              {product.imagen ? (
                <img
                  src={product.imagen}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 xl:w-12 xl:h-12 mb-0.5 xl:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-[8px] md:text-[10px] lg:text-xs font-medium">Sin foto</span>
                </div>
              )}
            </div>

            {/* Quantity Badge - Circular and prominent */}
            <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 xl:-top-3 xl:-right-3 w-7 h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 xl:w-16 xl:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg ring-2 lg:ring-4 ring-white transform group-hover:scale-110 transition-transform duration-300">
              <div className="text-center">
                <div className="text-xs md:text-sm lg:text-lg xl:text-2xl font-black text-white leading-none">{quantity}</div>
                <div className="text-[6px] md:text-[8px] lg:text-[10px] text-primary-100 font-semibold uppercase hidden md:block">und</div>
              </div>
            </div>

            {/* Pesable Badge */}
            {product.es_pesable && (
              <div className="absolute -bottom-1 xl:-bottom-2 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center gap-0.5 xl:gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[8px] md:text-[10px] lg:text-xs px-1.5 md:px-2 xl:px-3 py-0.5 xl:py-1 rounded-full font-bold shadow-lg">
                  <svg className="w-2 h-2 lg:w-3 lg:h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                  Pesable
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 space-y-1 md:space-y-1.5 lg:space-y-2 xl:space-y-3">
            {/* Title */}
            <div>
              <h3 className="font-black text-gray-900 text-xs md:text-sm lg:text-lg xl:text-3xl leading-tight mb-0.5 xl:mb-1 group-hover:text-primary-600 transition-colors duration-200 truncate">
                {product.descripcion}
              </h3>
              <p className="text-gray-500 text-[10px] md:text-xs lg:text-sm xl:text-lg font-medium truncate">{product.name || 'Sin descripción adicional'}</p>
            </div>

            {/* Code Badge */}
            <div className="inline-flex items-center gap-1 xl:gap-2 bg-gray-100 text-gray-600 px-1.5 md:px-2 xl:px-4 py-0.5 md:py-1 xl:py-2 rounded lg:rounded-lg font-mono text-[8px] md:text-[10px] lg:text-xs xl:text-sm">
              <svg className="w-2 h-2 md:w-3 md:h-3 xl:w-4 xl:h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="font-semibold">{product.cod_barra}</span>
            </div>

            {/* Price Info Grid */}
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 pt-0.5 xl:pt-2">
              {/* Unit Price */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded lg:rounded-xl p-1.5 md:p-2 lg:p-3 xl:p-4 border border-blue-200">
                <div className="text-blue-600 text-[8px] md:text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-0.5 xl:mb-1">Precio Unit.</div>
                <div className="text-blue-900 text-xs md:text-sm lg:text-lg xl:text-2xl font-black">₲{product.precio.toLocaleString('es-PY')}</div>
              </div>

              {/* Subtotal */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded lg:rounded-xl p-1.5 md:p-2 lg:p-3 xl:p-4 border border-green-200">
                <div className="text-green-600 text-[8px] md:text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-0.5 xl:mb-1">Subtotal</div>
                <div className="text-green-900 text-xs md:text-sm lg:text-lg xl:text-2xl font-black">₲{total.toLocaleString('es-PY')}</div>
              </div>
            </div>
          </div>

          {/* Delete Button - Floating */}
          <div className="flex-shrink-0">
            <button
              onClick={handleDelete}
              className="group/btn relative w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg lg:rounded-xl xl:rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 lg:focus:ring-4 focus:ring-red-300 hover:scale-110 hover:rotate-3 shadow-lg hover:shadow-2xl active:scale-95"
              title="Eliminar producto"
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 mx-auto group-hover/btn:scale-110 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>

              {/* Tooltip - hidden on small screens */}
              <div className="absolute -top-10 xl:-top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none hidden xl:block">
                <div className="bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                  Eliminar
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg lg:rounded-xl xl:rounded-2xl"></div>
    </div>
  );
}
