import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const INACTIVITY_TIMEOUT = 60000; // 60 segundos
const EXCLUDED_PATHS = ["/menu", "/login", "/"];

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExcluded = EXCLUDED_PATHS.includes(location.pathname);

  const handleTimeout = useCallback(() => {
    console.log("⏱️ Inactividad detectada - Volviendo al menú");
    sessionStorage.removeItem("currentOrder");
    sessionStorage.removeItem("invoiceData");
    sessionStorage.removeItem("pendingBarcode");
    sessionStorage.removeItem("priceCheckProducts");
    navigate("/menu");
  }, [navigate]);

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
