import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

const INACTIVITY_TIMEOUT = parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT || "60000", 10);
// La terminal de Capasu queda afuera del reloj de inactividad a proposito:
// nadie la toca. El cliente arma la compra con el colector y la escanea desde
// ahi, asi que ningun click ni touch reinicia el timer. Sin esta exclusion la
// caja abandona sola la pantalla del QR y el traspaso no tiene donde aterrizar.
const EXCLUDED_PATHS = ["/menu", "/login", "/", "/vertical-products"];

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetLanguage } = useLanguage();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExcluded = EXCLUDED_PATHS.includes(location.pathname);

  // Una compra de Capasu abandonada vuelve al QR, no al menu de Archi: la
  // pantalla del QR es el reposo de esa terminal, y si no esta puesta el
  // proximo cliente no tiene donde traspasar la suya.
  //
  // Se decide con el uuid que VerticalProductPage manda en el state al pasar
  // a cobrar. /payment lo comparten los dos flujos, asi que la ruta sola no
  // alcanza para distinguirlos.
  const desdeCapasu = Boolean(
    (location.state as { capasuSessionUuid?: string } | null)?.capasuSessionUuid,
  );

  const handleTimeout = useCallback(() => {
    const destino = desdeCapasu ? "/vertical-products" : "/menu";
    console.log(`⏱️ Inactividad detectada - Volviendo a ${destino}`);
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    sessionStorage.removeItem("pendingBarcode");
    sessionStorage.removeItem("priceCheckProducts");
    resetLanguage();
    navigate(destino);
  }, [navigate, resetLanguage, desdeCapasu]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isExcluded) {
      timerRef.current = setTimeout(handleTimeout, INACTIVITY_TIMEOUT);
    }
  }, [isExcluded, handleTimeout]);

  useEffect(() => {
    if (isExcluded) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const events = ["click", "touchstart", "keydown", "mousemove"];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar el timer
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isExcluded, resetTimer]);

  return <>{children}</>;
}
