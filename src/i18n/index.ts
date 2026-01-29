// Re-export i18n configuration and utilities
export { default as i18n, changeLanguage, getCurrentLanguage } from './config';
export type { SupportedLanguage } from './config';
export { useI18nToast } from './hooks/useI18nToast';
export * from './utils/formatting';
