import * as Sentry from "@sentry/react";

/**
 * Initialise Sentry pour le monitoring et le débogage à distance
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_APP_VERSION || '0.0.0';

  // Ne pas initialiser Sentry si le DSN n'est pas configuré
  if (!dsn) {
    console.warn('Sentry DSN non configuré. Le monitoring des erreurs est désactivé.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release: `citizen-vitae-app@${release}`,
    
    // Intégrations pour React
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Masque automatiquement tout le texte et les inputs sensibles
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Taux d'échantillonnage des performances (0.0 - 1.0)
    // En production, on capture 10% des transactions pour éviter les coûts élevés
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Taux d'échantillonnage des sessions de replay (0.0 - 1.0)
    // Capture 10% des sessions normales
    replaysSessionSampleRate: 0.1,
    
    // Capture 100% des sessions avec erreur
    replaysOnErrorSampleRate: 1.0,

    // Ne pas envoyer les erreurs en développement local (optionnel)
    enabled: environment !== 'development',

    // Filtrage des erreurs
    beforeSend(event, hint) {
      // Ignorer certaines erreurs connues ou non pertinentes
      const error = hint.originalException;
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        
        // Ignorer les erreurs de réseau temporaires
        if (message.includes('Network request failed')) {
          return null;
        }
        
        // Ignorer les erreurs d'extension de navigateur
        if (message.includes('extension://')) {
          return null;
        }
      }
      
      return event;
    },

    // Configuration des breadcrumbs (traces d'activité)
    beforeBreadcrumb(breadcrumb) {
      // Ne pas capturer les clics sur les éléments sensibles
      if (breadcrumb.category === 'ui.click') {
        const message = breadcrumb.message || '';
        if (message.includes('password') || message.includes('credit-card')) {
          return null;
        }
      }
      return breadcrumb;
    },
  });
};

/**
 * Configure le contexte utilisateur pour Sentry
 */
export const setSentryUser = (user: { id: string; email?: string; username?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Capture une erreur manuellement
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture un message d'information
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Ajoute un contexte personnalisé
 */
export const setContext = (name: string, context: Record<string, any>) => {
  Sentry.setContext(name, context);
};

/**
 * Ajoute un tag
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};
