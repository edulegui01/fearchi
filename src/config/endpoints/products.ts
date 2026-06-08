const BASE = import.meta.env.VITE_API_BASE_URL as string;
const VERSION = import.meta.env.VITE_API_VERSION as string;

export const PRODUCT_ENDPOINTS = {
  base: `${BASE}/api/${VERSION}/products`,
  byId: (id: string) => `${BASE}/api/${VERSION}/products/${id}`,
  byBarcode: (barcode: string) => `${BASE}/api/product/${barcode}`,
};
