"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLandingLanguage,
  getTranslation,
  isLandingLanguage,
  LANDING_LANGUAGE_KEY,
  type LandingLanguage,
} from "@landing/lib/translations";

type LandingLanguageContextValue = {
  language: LandingLanguage;
  setLanguage: (language: LandingLanguage) => void;
  t: (key: string) => string;
};

const LandingLanguageContext = createContext<LandingLanguageContextValue | null>(
  null,
);

export function LandingLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<LandingLanguage>(
    defaultLandingLanguage,
  );

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANDING_LANGUAGE_KEY);
    if (isLandingLanguage(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: LandingLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANDING_LANGUAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback(
    (key: string) => getTranslation(language, key),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LandingLanguageContext.Provider value={value}>
      {children}
    </LandingLanguageContext.Provider>
  );
}

export function useLandingLanguage() {
  const context = useContext(LandingLanguageContext);
  const [fallbackLanguage, setFallbackLanguageState] =
    useState<LandingLanguage>(defaultLandingLanguage);

  useEffect(() => {
    if (context) return;
    const savedLanguage = window.localStorage.getItem(LANDING_LANGUAGE_KEY);
    if (isLandingLanguage(savedLanguage)) {
      setFallbackLanguageState(savedLanguage);
    }
  }, [context]);

  const setFallbackLanguage = useCallback((nextLanguage: LandingLanguage) => {
    setFallbackLanguageState(nextLanguage);
    window.localStorage.setItem(LANDING_LANGUAGE_KEY, nextLanguage);
  }, []);

  const fallbackT = useCallback(
    (key: string) => getTranslation(fallbackLanguage, key),
    [fallbackLanguage],
  );

  return (
    context ?? {
      language: fallbackLanguage,
      setLanguage: setFallbackLanguage,
      t: fallbackT,
    }
  );
}
