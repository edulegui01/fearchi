import { createContext, useContext, useState, useCallback } from "react";

type AlertType = "error" | "success" | "warning" | "info";

interface AlertState {
  visible: boolean;
  message: string;
  type: AlertType;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
});

const alertStyles: Record<AlertType, { bg: string; icon: string; title: string; button: string }> = {
  error: {
    bg: "bg-red-50 border-red-400",
    icon: "text-red-600",
    title: "Error",
    button: "bg-red-600 hover:bg-red-700",
  },
  success: {
    bg: "bg-green-50 border-green-400",
    icon: "text-green-600",
    title: "Éxito",
    button: "bg-green-600 hover:bg-green-700",
  },
  warning: {
    bg: "bg-yellow-50 border-yellow-400",
    icon: "text-yellow-600",
    title: "Atención",
    button: "bg-yellow-600 hover:bg-yellow-700",
  },
  info: {
    bg: "bg-blue-50 border-blue-400",
    icon: "text-blue-600",
    title: "Información",
    button: "bg-blue-600 hover:bg-blue-700",
  },
};

const alertIcons: Record<AlertType, React.JSX.Element> = {
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    message: "",
    type: "error",
  });

  const showAlert = useCallback((message: string, type: AlertType = "error") => {
    setAlert({ visible: true, message, type });
  }, []);

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  const styles = alertStyles[alert.type];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className={`${styles.bg} border-2 rounded-3xl p-10 w-full max-w-2xl shadow-2xl flex flex-col items-center gap-6`}>
            <div className={styles.icon}>
              {alertIcons[alert.type]}
            </div>
            <h2 className={`text-4xl font-bold ${styles.icon}`}>
              {styles.title}
            </h2>
            <p className="text-2xl text-gray-700 text-center">
              {alert.message}
            </p>
            <button
              onClick={hideAlert}
              className={`${styles.button} text-white font-bold py-4 px-12 rounded-xl text-2xl mt-4 transition-colors duration-200`}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
