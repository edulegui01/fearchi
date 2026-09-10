import { VISION_ENABLED, VISION_ENDPOINTS } from '../config/endpoints/vision';

/**
 * Validacion por camara de lo que el cliente esta por pagar.
 *
 * La camara mantiene su propia lista de lo que fue reconociendo durante la
 * compra. Al cobrar se le manda el carrito y ella compara: el cartel de
 * "Aprobado" o "no coinciden" sale en la pantalla de vision, no aca, porque
 * quien lo mira es el operador parado al lado de la caja.
 *
 * Todo lo de este modulo es best-effort a proposito. Si la notebook de vision
 * esta apagada, fuera de red o tarda, la venta sigue su curso igual: una
 * validacion de apoyo que tumbe un cobro hace mas dano que no tenerla. Por eso
 * nada de aca lanza excepciones hacia la pantalla.
 */

/** Producto que aparece en un lado de la comparacion y no en el otro. */
export interface VisionDiff {
  barcode: string;
  name: string;
}

export interface VisionVerdict {
  ok: boolean;
  at: string;
  /** Codigos que la camara reconocio durante la compra. */
  visto: string[];
  /** El carrito los cobra y la camara nunca los vio. */
  faltan: VisionDiff[];
  /** La camara los vio y el carrito no los cobra. La senal que importa. */
  sobran: VisionDiff[];
  /** Reconocidos pero sin codigo cargado: no entran en la comparacion. */
  sin_codigo: string[];
}

/** Cuanto se espera a la notebook antes de seguir sin ella. */
const TIMEOUT_MS = 2500;

export const isVisionEnabled = (): boolean => VISION_ENABLED;

/**
 * POST a vision que nunca lanza: devuelve la respuesta o null.
 *
 * Todo lo de este modulo pasa por aca justamente para que ninguna falla de red
 * llegue a la pantalla de venta.
 */
async function post<T>(url: string, body: unknown, que: string): Promise<T | null> {
  if (!VISION_ENABLED) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`visión respondió ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`⚠️ Cámara (${que}) no disponible:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Empieza una compra: canasta limpia y camara arrancada.
 *
 * Se llama al entrar en la pantalla de venta. Del otro lado es idempotente, asi
 * que volver a esta pantalla dentro de la misma compra —ir a consultar un
 * precio y regresar— no tira lo que la camara ya venia reconociendo.
 *
 * La camara se suelta sola cuando una compra se aprueba, asi que no hace falta
 * pararla al salir de la pantalla.
 */
export async function abrir(): Promise<boolean> {
  const r = await post<{ arrancado: boolean }>(VISION_ENDPOINTS.abrir, {}, 'arrancar');
  if (r?.arrancado) console.log('📷 Cámara arrancada para esta compra');
  return r !== null;
}

/** Suelta la camara sin comparar nada. Para una compra cancelada. */
export async function cerrar(): Promise<boolean> {
  return (await post(VISION_ENDPOINTS.cerrar, {}, 'parar')) !== null;
}

/**
 * Manda el carrito a vision y devuelve el veredicto, o null si no se pudo.
 *
 * Los codigos se deduplican porque del otro lado la lista es un conjunto: la
 * camara no puede contar cuantas unidades hay de un producto, solo si lo vio.
 */
export async function check(barcodes: string[]): Promise<VisionVerdict | null> {
  if (!VISION_ENABLED) return null;

  const unicos = [...new Set(barcodes.map((b) => String(b ?? '').trim()).filter(Boolean))];

  const verdict = await post<VisionVerdict>(
    VISION_ENDPOINTS.check, { barcodes: unicos }, 'validar');
  if (verdict) {
    console.log(
      verdict.ok ? '✅ Cámara: aprobado' : '⚠️ Cámara: los productos no coinciden',
      verdict,
    );
  }
  return verdict;
}

export default { check, abrir, cerrar, isVisionEnabled };
