import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient optimisé pour l'application Citizen Vitae
 * 
 * Configuration pour réduire les requêtes inutiles et améliorer les performances :
 * - staleTime: 5 minutes - Les données sont considérées fraîches pendant 5 min
 * - gcTime: 10 minutes - Les données en cache sont gardées 10 min après inutilisation
 * - refetchOnWindowFocus: false - Pas de refetch automatique au focus
 * - retry: 1 - Une seule tentative en cas d'erreur
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Évite les refetch inutiles si les données sont fraîches
      retry: 1,
      // Retry seulement pour les erreurs réseau, pas pour les 4xx/5xx
      retryOnMount: false,
    },
    mutations: {
      retry: 1,
      // Retry seulement pour les erreurs réseau
    },
  },
});
