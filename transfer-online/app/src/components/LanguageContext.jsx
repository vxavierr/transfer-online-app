import React, { createContext, useContext, useState, useEffect } from 'react';
import ptBR from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';
import { StorageService } from '@/native';

const translations = {
  'pt-BR': ptBR,
  'en': en,
  'es': es
};

const LANG_KEY = 'app_language';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Inicialização síncrona com localStorage para evitar flash de conteúdo
  // Em nativo, StorageService sincroniza de Capacitor Preferences no useEffect abaixo
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(LANG_KEY) || 'pt-BR';
  });

  // Sincroniza com Capacitor Preferences ao montar (necessário em nativo)
  useEffect(() => {
    const syncFromNative = async () => {
      const stored = await StorageService.get(LANG_KEY);
      if (stored && stored !== language && translations[stored]) {
        setLanguage(stored);
      }
    };
    syncFromNative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste mudança de idioma em ambos os stores
  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
    StorageService.set(LANG_KEY, language).catch(() => {});
  }, [language]);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined) {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }

    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  };

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
