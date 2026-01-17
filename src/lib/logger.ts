/**
 * Logger conditionnel pour remplacer console.log
 * 
 * En production, seules les erreurs sont loggées.
 * En développement, tous les logs sont affichés.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log d'information (uniquement en développement)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log('[LOG]', ...args);
    }
  },

  /**
   * Log d'erreur (toujours affiché)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
    // TODO: Envoyer à un service de monitoring (Sentry, etc.)
  },

  /**
   * Log d'avertissement (uniquement en développement)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log de debug (uniquement en développement)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log d'information avec contexte (uniquement en développement)
   */
  info: (context: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[${context}]`, ...args);
    }
  },
};
