import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast as sonnerToast } from 'sonner';
import { toast as radixToast } from '@/hooks/use-toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  description?: string;
  descriptionKey?: string;
  descriptionParams?: Record<string, string | number>;
  duration?: number;
  type?: ToastType;
}

/**
 * Unified i18n toast hook that works with both sonner and radix toast
 * Automatically translates toast messages using i18next
 */
export const useI18nToast = () => {
  const { t } = useTranslation('toasts');

  /**
   * Show a translated toast using sonner (preferred for simple toasts)
   */
  const showToast = useCallback((
    titleKey: string,
    options?: ToastOptions
  ) => {
    const title = t(titleKey);
    const description = options?.descriptionKey 
      ? t(options.descriptionKey, options.descriptionParams)
      : options?.description;
    
    const type = options?.type || 'success';
    
    switch (type) {
      case 'error':
        sonnerToast.error(title, { description, duration: options?.duration });
        break;
      case 'warning':
        sonnerToast.warning(title, { description, duration: options?.duration });
        break;
      case 'info':
        sonnerToast.info(title, { description, duration: options?.duration });
        break;
      default:
        sonnerToast.success(title, { description, duration: options?.duration });
    }
  }, [t]);

  /**
   * Show a translated toast using radix toast (for more complex UI toasts)
   */
  const showRadixToast = useCallback((
    titleKey: string,
    options?: ToastOptions & { variant?: 'default' | 'destructive' }
  ) => {
    const title = t(titleKey);
    const description = options?.descriptionKey 
      ? t(options.descriptionKey, options.descriptionParams)
      : options?.description;
    
    radixToast({
      title,
      description,
      variant: options?.variant,
      duration: options?.duration,
    });
  }, [t]);

  /**
   * Quick success toast
   */
  const success = useCallback((titleKey: string, descriptionKey?: string) => {
    showToast(titleKey, { descriptionKey, type: 'success' });
  }, [showToast]);

  /**
   * Quick error toast
   */
  const error = useCallback((titleKey: string, descriptionKey?: string) => {
    showToast(titleKey, { descriptionKey, type: 'error' });
  }, [showToast]);

  /**
   * Quick warning toast
   */
  const warning = useCallback((titleKey: string, descriptionKey?: string) => {
    showToast(titleKey, { descriptionKey, type: 'warning' });
  }, [showToast]);

  /**
   * Quick info toast
   */
  const info = useCallback((titleKey: string, descriptionKey?: string) => {
    showToast(titleKey, { descriptionKey, type: 'info' });
  }, [showToast]);

  return {
    showToast,
    showRadixToast,
    success,
    error,
    warning,
    info,
    t, // Expose t for custom usage
  };
};

export default useI18nToast;
