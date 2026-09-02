import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const money = (value: number) => `₲${value.toLocaleString('es-PY')}`;

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
  const navigate = useNavigate();

  const [session, setSession] = useState<CapasuSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  const handlePaymentConfirm = (ruc: string, razonSocial: string) => {
    if (!session) return;

    setIsPaymentModalOpen(false);

    // Se mantiene la forma que espera /payment: esa pantalla no sabe nada de
    // Capasu y no hay motivo para que lo aprenda.
    navigate('/payment', {
      state: {
        products: session.items.map((item) => ({
          cod_barra: String(item.product_id),
          name: item.name ?? item.sku ?? '',
          precio: item.unit_price ?? 0,
          total: item.line_total ?? 0,
        })),
        productQuantities: Object.fromEntries(
          session.items.map((item) => [String(item.product_id), item.quantity]),
        ),
        totalAmount: session.total,
        ruc,
        razonSocial,
        capasuSessionUuid: session.uuid,
      },
    });
  };

  // ── Esperando que alguien escanee el QR ───────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-primary-400 flex flex-col p-7">
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-4">
          <div className="flex justify-center">
            <img src={scoLogo} alt="Fe-SCO" className="h-auto w-96" />
          </div>
        </div>

        <div className="flex-1 bg-primary-50 rounded-lg shadow-inner flex flex-col items-center justify-center gap-10 p-10">
          <h2 className="text-5xl font-semibold text-secondary-800 text-center">
            Escaneá este código
            <br />
            con tu colector
          </h2>

          <div className="bg-white rounded-3xl p-10 shadow-md">
            <QRCode
              value={`${CAPASU_TERMINAL_QR_PREFIX}${CAPASU_TERMINAL_CODE}`}
              size={340}
            />
          </div>

          <p className="text-3xl text-gray-500">Caja {CAPASU_TERMINAL_CODE}</p>

          {error && <p className="text-xl text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Compra traspasada ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-primary-400 flex flex-col p-7">
      <div className="w-full flex flex-col">
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-4">
          <div className="flex justify-center mb-4">
            <img src={scoLogo} alt="Fe-SCO" className="h-auto w-96" />
          </div>
          <h2 className="text-4xl font-semibold text-primary-400 text-center mb-3">
            Tu compra
          </h2>
        </div>

        <div className="h-[63vh] mb-6 overflow-y-auto bg-primary-50 rounded-lg shadow-inner">
          <div className="p-6">
            <div className="flex items-center gap-8 mb-6 px-6">
              <div className="flex-shrink-0 w-24" />
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                  Producto
                </div>
              </div>
              <div className="text-center flex-shrink-0 w-28">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                  Cantidad
                </div>
              </div>
              <div className="text-center flex-shrink-0 w-32">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                  Precio
                </div>
              </div>
              <div className="text-center flex-shrink-0 w-32">
                <div className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                  Sub Total
                </div>
              </div>
            </div>

            {/* Filas propias en vez de ProductItem: ese componente siempre
                dibuja el boton de borrar y los +/−, y aca la compra no se
                puede modificar. */}
            <div className="space-y-4">
              {session.items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-8 bg-white rounded-lg px-6 py-4 shadow-sm"
                >
                  <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="max-h-24 max-w-24 object-contain"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gray-100" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-semibold text-gray-800 truncate">
                      {item.name ?? item.sku ?? `#${item.product_id}`}
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0 w-28 text-2xl font-semibold text-gray-800">
                    {item.quantity}
                  </div>
                  <div className="text-center flex-shrink-0 w-32 text-2xl text-gray-600">
                    {item.unit_price !== null ? money(item.unit_price) : '—'}
                  </div>
                  <div className="text-center flex-shrink-0 w-32 text-2xl font-bold text-gray-800">
                    {item.line_total !== null ? money(item.line_total) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg shadow-sm p-11 mb-4 mt-1">
          <div className="flex justify-end">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-semibold text-gray-700">
                Total a Pagar:
              </div>
              <div className="text-5xl font-bold text-primary-400">
                {money(session.total)}
              </div>
            </div>
          </div>
        </div>

        {/* Sin boton de cancelar: la compra ya fue traspasada a esta caja y no
            hay endpoint para devolverla. Abandonarla es una decision del
            personal, no algo que se resuelva con un toque en el kiosco. */}
        <div className="flex justify-center mt-3">
          <button
            onClick={handlePagar}
            className="w-full bg-primary-50 text-black py-11 rounded-lg text-4xl font-semibold min-w-64"
          >
            Pagar
          </button>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        totalAmount={session.total}
      />
    </div>
  );
}
