import { useMemo } from 'react';
import { fr, enUS } from 'date-fns/locale';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export type SupportedLocale = 'fr' | 'en';

interface LocaleData {
  locale: typeof fr | typeof enUS;
  language: SupportedLocale;
  isLoading: boolean;
}

/**
 * Hook to get the date-fns locale based on user preferences
 * Falls back to French if preferences are not loaded
 */
export const useLocale = (): LocaleData => {
  const { preferences, isLoading } = useUserPreferences();

  const localeData = useMemo(() => {
    const language = (preferences?.language || 'fr') as SupportedLocale;
    const locale = language === 'en' ? enUS : fr;
    
    return {
      locale,
      language,
      isLoading,
    };
  }, [preferences?.language, isLoading]);

  return localeData;
};

/**
 * Get date-fns locale from language code (for contexts without hooks)
 */
export const getLocaleFromLanguage = (language: SupportedLocale): typeof fr | typeof enUS => {
  return language === 'en' ? enUS : fr;
};
