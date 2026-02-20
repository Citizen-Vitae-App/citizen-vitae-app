import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fr, enUS } from 'date-fns/locale';
import type { SupportedLanguage } from '@/i18n/config';

interface LocaleData {
  locale: typeof fr | typeof enUS;
  language: SupportedLanguage;
  isLoading: boolean;
}

/**
 * Hook to get the date-fns locale based on i18next language
 * Automatically syncs with user preferences through I18nProvider
 */
export const useLocale = (): LocaleData => {
  const { i18n, ready } = useTranslation();

  const localeData = useMemo(() => {
    const language = (i18n.language?.substring(0, 2) || 'fr') as SupportedLanguage;
    const locale = language === 'en' ? enUS : fr;
    
    return {
      locale,
      language,
      isLoading: !ready,
    };
  }, [i18n.language, ready]);

  return localeData;
};

/**
 * Get date-fns locale from language code (for contexts without hooks)
 */
export const getLocaleFromLanguage = (language: SupportedLanguage): typeof fr | typeof enUS => {
  return language === 'en' ? enUS : fr;
};
