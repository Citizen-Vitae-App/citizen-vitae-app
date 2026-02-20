import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { changeLanguage, type SupportedLanguage } from '@/i18n/config';

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Provider component that synchronizes i18next language with user preferences from DB
 * Place this inside AuthProvider so it has access to user context
 */
export const I18nProvider = ({ children }: I18nProviderProps) => {
  const { i18n } = useTranslation();
  const { preferences, isLoading } = useUserPreferences();

  // Sync language from DB to i18next when preferences load
  useEffect(() => {
    if (!isLoading && preferences?.language) {
      const dbLanguage = preferences.language as SupportedLanguage;
      const currentLanguage = i18n.language?.substring(0, 2) as SupportedLanguage;
      
      if (dbLanguage !== currentLanguage) {
        changeLanguage(dbLanguage);
      }
    }
  }, [preferences?.language, isLoading, i18n.language]);

  return <>{children}</>;
};

export default I18nProvider;
