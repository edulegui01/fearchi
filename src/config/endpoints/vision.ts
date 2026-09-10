/**
 * Endpoints del validador por camara.
 *
 * Corre en una maquina aparte —la notebook que tiene la webcam apuntando a la
 * zona de ensacado—, no en ninguno de los backends del SCO. Por eso tiene su
 * propia base: no cuelga de VITE_API_BASE_URL ni del backend de venta.
 *
 * Con la variable vacia la validacion queda apagada, que es el default. Asi la
 * terminal se despliega una sola vez y la camara se prende por configuracion,
 * sin recompilar.
 */
const BASE = ((import.meta.env.VITE_VISION_URL as string) ?? '').trim().replace(/\/$/, '');

export const VISION_ENABLED = BASE !== '';

export const VISION_ENDPOINTS = {
  /** Empieza una compra: canasta limpia y camara arrancada. Idempotente. */
  abrir: `${BASE}/api/canasta/abrir`,

  /** Suelta la camara sin comparar. Para una compra cancelada. */
  cerrar: `${BASE}/api/canasta/cerrar`,

  /** Le manda el carrito y devuelve el veredicto contra lo que vio la camara. */
  check: `${BASE}/api/canasta/check`,

  /** Lo que la camara lleva reconocido. Util para diagnostico. */
  canasta: `${BASE}/api/canasta`,
};
