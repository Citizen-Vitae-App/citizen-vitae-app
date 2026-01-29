import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import French translations
import frCommon from './locales/fr/common.json';
import frToasts from './locales/fr/toasts.json';
import frErrors from './locales/fr/errors.json';
import frForms from './locales/fr/forms.json';
import frPages from './locales/fr/pages.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enToasts from './locales/en/toasts.json';
import enErrors from './locales/en/errors.json';
import enForms from './locales/en/forms.json';
import enPages from './locales/en/pages.json';

export const defaultNS = 'common';
export const resources = {
  fr: {
    common: frCommon,
    toasts: frToasts,
    errors: frErrors,
    forms: frForms,
    pages: frPages,
  },
  en: {
    common: enCommon,
    toasts: enToasts,
    errors: enErrors,
    forms: enForms,
    pages: enPages,
  },
} as const;

export type SupportedLanguage = 'fr' | 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false, // Disable suspense to prevent loading flashes
    },
  });

// Helper function to change language (used for DB sync)
export const changeLanguage = async (lng: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(lng);
};

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language?.substring(0, 2) as SupportedLanguage) || 'fr';
};

export default i18n;
