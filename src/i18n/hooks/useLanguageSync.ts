import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, type SupportedLanguage } from '../config';
import { useUserPreferences } from '@/hooks/useUserPreferences';

/**
 * Hook to synchronize i18next language with user preferences from DB
 * Should be used once at the app root level
 */
export const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { preferences, isLoading } = useUserPreferences();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only sync once preferences are loaded and we haven't initialized yet
    if (!isLoading && preferences?.language && !hasInitialized.current) {
      const dbLanguage = preferences.language as SupportedLanguage;
      const currentLanguage = i18n.language?.substring(0, 2) as SupportedLanguage;
      
      if (dbLanguage !== currentLanguage) {
        changeLanguage(dbLanguage);
      }
      hasInitialized.current = true;
    }
  }, [preferences?.language, isLoading, i18n.language]);

  // Also sync when language changes in preferences (e.g., user changes in settings)
  useEffect(() => {
    if (hasInitialized.current && preferences?.language) {
      const dbLanguage = preferences.language as SupportedLanguage;
      const currentLanguage = i18n.language?.substring(0, 2) as SupportedLanguage;
      
      if (dbLanguage !== currentLanguage) {
        changeLanguage(dbLanguage);
      }
    }
  }, [preferences?.language, i18n.language]);

  return {
    currentLanguage: i18n.language?.substring(0, 2) as SupportedLanguage,
    isLoading,
  };
};

export default useLanguageSync;
