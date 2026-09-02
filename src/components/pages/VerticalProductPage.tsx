import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

import scoLogo from '../../assets/sco-logo.png';
import PaymentModal from '../components/PaymentModal';
import CapasuService from '../../services/CapasuService';
import {
  CAPASU_TERMINAL_CODE,
  CAPASU_TERMINAL_QR_PREFIX,
} from '../../config/endpoints/capasu';
import type { CapasuSession } from '../../types/capasu';

/** Cada cuanto se pregunta si llego una compra. */
const POLL_MS = 1000;

/** Cuanto se queda el comprobante antes de volver al QR. */
const COMPROBANTE_MS = 6000;

const money = (value: number) => `₲${value.toLocaleString('es-PY')}`;

/**
 * La paleta del colector, con los mismos valores.
 *
 * No son elecciones de esta pantalla: salen de `main.dart` y de la pagina de
 * compra de la app Flutter. El cliente pasa de un dispositivo al otro en diez
 * segundos y tienen que verse del mismo producto.
 *
 * Van escritos a mano y no tomados del tema de Tailwind porque ese tema es de
 * Archi: ahi `primary` es una escala de rojo y `secondary` uno de blancos, asi
 * que `text-secondary-800` era texto gris clarisimo y el fondo de la pantalla
 * entera era rojo salmon. Fijarlos aca no le cambia el aspecto al resto de la
 * app.
 */
const NARANJA = '#F18F18';
const TINTA = '#000000';
const FONDO = '#FFFFFF';
const SUPERFICIE = '#F6F6F7';
const SECUNDARIO = '#ECECEE';
const ROJO = '#D32F2F';
const VERDE = '#2E9E4F';

/**
 * Terminal de self-checkout del flujo Capasu.
 *
 * Esta pantalla ya no escanea ni pesa nada. El cliente arma la compra con el
 * colector y la balanza la valida antes de llegar aca: la terminal solo espera
 * a que le traspasen una compra cerrada, la lista y cobra.
 *
 * Por eso se quitaron el `barcodeService`, el socket de balanza, el
 * `ScaleModal` y la validacion local de peso: repetir aca un control que ya se
 * hizo solo agrega una forma nueva de que falle.
 *
 * El listado es de solo lectura a proposito. Esa compra fue validada contra el
 * peso del carrito; si en la caja se pudiera sacar una linea, el cliente se
 * llevaria el producto sin pagarlo y la validacion por peso dejaria de servir.
 */
export default function VerticalProductPage() {
  const [session, setSession] = useState<CapasuSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Se muestra despues de cobrar. La compra pagada deja de ser la actual de la
  // terminal, asi que el poll siguiente ya devuelve null: sin esta pantalla el
  // listado se esfumaria de golpe y nadie sabria si el cobro salio bien.
  const [cobrada, setCobrada] = useState(false);

  // Cancelar pide confirmacion: la compra se pierde entera y rehacerla es
  // recorrer el salon de nuevo, asi que un toque suelto no puede alcanzar.
  const [confirmandoCancel, setConfirmandoCancel] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const current = await CapasuService.currentSession(CAPASU_TERMINAL_CODE);
        if (cancelled) return;
        setSession(current);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        // Un fallo de red no borra lo que ya se mostro: si la compra estaba en
        // pantalla, sigue ahi mientras se reintenta.
        setError(e instanceof Error ? e.message : 'Error de conexion');
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handlePagar = () => setIsPaymentModalOpen(true);

  /**
   * Cobro simulado: cierra la compra en el backend y muestra el comprobante.
   *
   * No pasa por /payment ni registra una venta. Los datos de facturacion que
   * pide el modal todavia no se guardan en ningun lado —el backend no tiene
   * donde ponerlos— asi que se recogen y se descartan.
   */
  const handlePaymentConfirm = async (_ruc: string, _razonSocial: string) => {
    if (!session) return;

    setIsPaymentModalOpen(false);

    try {
      await CapasuService.pay(session.uuid);
      setCobrada(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la compra');
    }
  };

  const handleCancelar = async () => {
    if (!session) return;

    setConfirmandoCancel(false);

    try {
      await CapasuService.release(session.uuid);
      // No hay pantalla de despedida: no se cobro nada y no hay nada que
      // confirmarle a nadie. El poll siguiente ya devuelve 404 y vuelve el QR.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar la compra');
    }
  };

  // El comprobante no se cierra con un toque: el cliente ya se esta yendo con
  // sus bolsas y la caja tiene que quedar libre igual.
  useEffect(() => {
    if (!cobrada) return;
    const t = setTimeout(() => setCobrada(false), COMPROBANTE_MS);
    return () => clearTimeout(t);
  }, [cobrada]);

  // ── Cobrada ───────────────────────────────────────────────────────────────
  //
  // La unica pantalla naranja de punta a punta. Es la que tiene que leerse
  // desde el otro lado del local: le dice a quien espera que esa caja se
  // libero, sin que nadie tenga que acercarse a mirar.
  if (cobrada) {
    return (
      <div
        className="capasu min-h-screen flex flex-col items-center justify-center gap-14 p-16"
        style={{ backgroundColor: NARANJA }}
      >
        <div className="w-64 h-64 rounded-full bg-white flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-40 h-40" fill="none">
            <path
              d="M4 12.5l5.5 5.5L20 7"
              stroke={NARANJA}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-7xl font-bold text-center text-white leading-tight">
          ¡Gracias por
          <br />
          tu compra!
        </h2>
        <p className="text-4xl text-center text-white/80">
          Ya podés retirar tus productos
        </p>
      </div>
    );
  }

  // ── Esperando que alguien escanee el QR ───────────────────────────────────
  if (!session) {
    return (
      <div className="capasu min-h-screen flex flex-col" style={{ backgroundColor: FONDO }}>
        {/* Bloque de color que ocupa la mitad de alto de una pantalla vertical.
            La instruccion tiene que leerse de pie y a un par de metros, antes
            de que la persona se acerque. */}
        <div
          className="flex-1 rounded-b-[64px] flex flex-col items-center justify-center px-12 pb-40 pt-16"
          style={{ backgroundColor: NARANJA }}
        >
          <h2 className="text-7xl font-bold text-center text-white leading-tight">
            Escaneá este código
            <br />
            con tu colector
          </h2>
        </div>

        {/* El QR monta sobre el naranja: queda a media altura, que es donde
            apunta el lector sin que nadie se agache ni estire. */}
        <div className="flex flex-col items-center px-12 -mt-32">
          <div className="bg-white rounded-[48px] p-10 shadow-2xl">
            {/* level="H" y no el "L" por defecto de la libreria. Contra una
                pantalla el lector dispara su LED y el reflejo vuelve al sensor:
                con "L" se tolera perder el 7% del codigo y un brillo sobre una
                esquina ya lo arruina; con "H", el 30%. El contenido es corto
                —capasu:terminal:SCO-01— asi que la redundancia extra no agranda
                casi nada la trama. */}
            <QRCode
              value={`${CAPASU_TERMINAL_QR_PREFIX}${CAPASU_TERMINAL_CODE}`}
              size={340}
              level="H"
              // Sin esto el navegador suaviza los bordes de cada modulo: el
              // ancho de modulo no cae en un numero entero de pixeles y las
              // orillas quedan grises. El lector necesita el salto brusco
              // blanco/negro, y con los bordes difuminados falla de a ratos.
              //
              // Es la diferencia con el QR de la etiqueta, que se lee sin
              // problemas: ese va en un PDF, rasterizado a mucha mas
              // resolucion, donde el suavizado no llega a ensuciar el modulo.
              shapeRendering="crispEdges"
            />
          </div>

          <div className="mt-8 text-4xl font-bold" style={{ color: NARANJA }}>
            Caja {CAPASU_TERMINAL_CODE}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-end gap-8 pb-16 px-12">
          {error && (
            <p
              className="text-2xl px-8 py-4 rounded-2xl text-center"
              style={{ color: ROJO, backgroundColor: `${ROJO}14` }}
            >
              {error}
            </p>
          )}
          <img src={scoLogo} alt="" className="h-24 w-auto object-contain" />
        </div>
      </div>
    );
  }

  // ── Compra traspasada ─────────────────────────────────────────────────────
  return (
    <div className="capasu min-h-screen flex flex-col" style={{ backgroundColor: FONDO }}>
      {/* Encabezado de color: ancla la pantalla y deja claro de un vistazo que
          esta caja esta ocupada por una compra. */}
      <div
        className="rounded-b-[48px] px-12 pt-12 pb-10 flex items-center justify-between"
        style={{ backgroundColor: NARANJA }}
      >
        <h2 className="text-6xl font-bold text-white">Tu compra</h2>
        <span className="px-7 py-3 rounded-full text-2xl font-semibold text-white bg-white/25">
          Caja {CAPASU_TERMINAL_CODE}
        </span>
      </div>

      {/* Sin encabezado de columnas: son cuatro palabras que se leen una sola
          vez y despues ocupan lugar. Cada fila ya se explica sola. */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-12 py-8">
        {session.items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-8 rounded-3xl px-8 py-6"
            style={{ backgroundColor: SUPERFICIE }}
          >
            <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" className="max-h-24 max-w-24 object-contain" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-3xl font-semibold truncate" style={{ color: TINTA }}>
                {item.name ?? item.sku ?? `#${item.product_id}`}
              </div>
              {/* La cantidad junto al precio unitario y no en su propia
                  columna: "2 × ₲15.000" es una sola idea y se lee de un golpe. */}
              <div className="text-2xl text-gray-500 mt-1">
                {item.quantity} × {item.unit_price !== null ? money(item.unit_price) : '—'}
              </div>
            </div>

            <div className="text-3xl font-bold flex-shrink-0" style={{ color: TINTA }}>
              {item.line_total !== null ? money(item.line_total) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* El total y los botones no scrollean: en una pantalla alta, lo que hay
          que hacer no puede quedar debajo del pliegue. */}
      <div className="px-12 pb-12 pt-6 flex flex-col gap-6">
        <div
          className="rounded-[40px] px-12 py-10 flex items-center justify-between"
          style={{ backgroundColor: NARANJA }}
        >
          <span className="text-4xl font-semibold text-white/85">Total</span>
          <span className="text-7xl font-bold text-white">{money(session.total)}</span>
        </div>

        {/* Cancelar existe pero no compite: sin esta salida, una compra
            abandonada deja la caja ocupada hasta que llegue la siguiente, con
            el listado de otra persona a la vista. */}
        <div className="flex gap-5">
          <button
            onClick={() => setConfirmandoCancel(true)}
            className="px-14 py-9 rounded-[32px] text-3xl font-semibold text-black/60"
            style={{ backgroundColor: SECUNDARIO }}
          >
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            className="flex-1 py-9 rounded-[32px] text-5xl font-bold text-white"
            style={{ backgroundColor: TINTA }}
          >
            Pagar
          </button>
        </div>
      </div>

      {confirmandoCancel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-12 z-50">
          <div className="bg-white rounded-[48px] p-16 flex flex-col items-center gap-10 w-full max-w-3xl">
            <h3 className="text-5xl font-bold text-center" style={{ color: TINTA }}>
              ¿Cancelar la compra?
            </h3>
            <p className="text-3xl text-gray-500 text-center">
              Vas a tener que volver a escanear todos los productos.
            </p>
            <div className="flex gap-6 w-full">
              <button
                onClick={() => setConfirmandoCancel(false)}
                className="flex-1 py-8 rounded-[32px] text-3xl font-semibold text-white"
                style={{ backgroundColor: TINTA }}
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                className="flex-1 py-8 rounded-[32px] text-3xl font-semibold"
                style={{ color: ROJO, backgroundColor: `${ROJO}14` }}
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        totalAmount={session.total}
      />
    </div>
  );
}
