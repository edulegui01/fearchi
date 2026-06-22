import { createContext, useContext, useState, useCallback } from "react";
import { translations, type Language } from "../../i18n/translations";

const LANGUAGE_STORAGE_KEY = "scoLanguage";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  resetLanguage: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "es",
  setLanguage: () => {},
  resetLanguage: () => {},
  t: (key) => key,
});

function getInitialLanguage(): Language {
  const stored = sessionStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" ? "en" : "es";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    sessionStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  const resetLanguage = useCallback(() => {
    setLanguageState("es");
    sessionStorage.removeItem(LANGUAGE_STORAGE_KEY);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const [namespace, ...rest] = key.split(".");
      const dictionary = translations[language] as unknown as Record<string, Record<string, string>>;
      let text = dictionary[namespace]?.[rest.join(".")] ?? key;

      if (vars) {
        for (const [varName, value] of Object.entries(vars)) {
          text = text.replace(`{{${varName}}}`, String(value));
        }
      }

      return text;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, resetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
