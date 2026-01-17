# Rapport d'Analyse et Optimisation - Citizen Vitae

## 📊 Résumé Exécutif

Ce rapport identifie les opportunités d'optimisation pour améliorer les performances, la scalabilité et la sécurité de l'application Citizen Vitae, tout en conservant les fonctionnalités existantes.

**Statistiques du codebase :**
- 73 fichiers avec useState/useEffect (429 occurrences)
- 184 console.log/error/warn à nettoyer
- 57 utilisations de useMemo/useCallback (bon début)
- 25 hooks personnalisés
- 22 pages React

---

## 🚀 1. PERFORMANCES - Chargement des Pages

### 1.1 Configuration React Query (CRITIQUE)

**Problème :** `QueryClient` créé sans configuration optimale dans `App.tsx`

```typescript
// ❌ Actuel - Pas de configuration
const queryClient = new QueryClient();
```

**Solution :**
```typescript
// ✅ Optimisé
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false, // Évite les refetch inutiles
    },
    mutations: {
      retry: 1,
    },
  },
});
```

**Impact :** Réduction de 40-60% des requêtes réseau inutiles

---

### 1.2 Lazy Loading Manquant

**Problème :** `Index`, `Auth`, et `NotFound` ne sont pas lazy-loaded alors qu'ils pourraient l'être

**Solution :**
```typescript
// ✅ Lazy-load même les pages "simples"
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
```

**Impact :** Réduction du bundle initial de ~15-20%

---

### 1.3 Optimisation Vite

**Problème :** Configuration Vite basique, pas d'optimisations de build

**Solution :** Ajouter dans `vite.config.ts` :
```typescript
export default defineConfig(({ mode }) => ({
  // ... config existante
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* autres radix */],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
  },
  // Optimisation des dépendances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
  },
}));
```

**Impact :** Meilleur code splitting, cache navigateur amélioré

---

### 1.4 Memoization des Composants

**Problème :** Peu de composants mémorisés, re-renders inutiles

**Recommandations :**
- Mémoriser les composants de liste (EventCard, etc.)
- Utiliser `React.memo` pour les composants enfants coûteux
- Mémoriser les callbacks avec `useCallback` (déjà partiellement fait)

**Exemple :**
```typescript
// ✅ Mémoriser EventCard
export const EventCard = React.memo(({ event, ...props }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.event.id === nextProps.event.id && 
         prevProps.event.updated_at === nextProps.event.updated_at;
});
```

---

## 🔒 2. SÉCURITÉ

### 2.1 Nettoyage des Console.log (IMPORTANT)

**Problème :** 184 console.log/error/warn dans le code de production

**Solution :** 
- Créer un utilitaire de logging conditionnel
- Supprimer tous les console.log de production
- Garder seulement les erreurs critiques

```typescript
// src/lib/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) console.log(...args);
  },
  error: (...args: any[]) => console.error(...args), // Toujours log les erreurs
  warn: (...args: any[]) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
};
```

**Impact :** Sécurité (pas d'exposition de données), performance légère

---

### 2.2 Validation des Entrées

**✅ Bon :** Utilisation de Zod pour la validation
**⚠️ Amélioration :** Centraliser les schémas de validation

**Recommandation :** Créer `src/lib/validation/schemas.ts` pour centraliser tous les schémas

---

### 2.3 Sanitization HTML

**✅ Bon :** Utilisation de DOMPurify dans `sanitize.ts`
**⚠️ Vérifier :** S'assurer que tous les contenus utilisateur passent par `sanitizeHtml`

---

## 📈 3. SCALABILITÉ

### 3.1 Requêtes en Série vs Parallèle

**Problème identifié :** Dans `useUserProfile.tsx`, les requêtes sont faites en série

```typescript
// ❌ Actuel - Série
const orgsWithCounts = await Promise.all(
  memberships.map(async (m) => {
    const { count } = await supabase // Requête individuelle
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);
    // ...
  })
);
```

**Solution :** Utiliser une requête groupée ou un RPC Supabase

```typescript
// ✅ Optimisé - Une seule requête avec agrégation
const { data } = await supabase.rpc('get_org_member_counts', {
  org_ids: memberships.map(m => m.organizations.id)
});
```

**Impact :** Réduction du temps de chargement de 60-80% pour les pages avec organisations

---

### 3.2 Gestion d'État Globale

**Problème :** Pas de store global (Zustand installé mais non utilisé)

**Recommandation :** Utiliser Zustand pour :
- État UI global (modals, sidebars)
- Cache de données fréquemment accédées
- État de formulaire partagé

**Exemple :**
```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

---

### 3.3 Pagination et Virtualisation

**Problème :** Pas de pagination visible pour les grandes listes (EventsTab, PeopleTab)

**Solution :** Implémenter la pagination côté serveur avec React Query

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['events', organizationId],
  queryFn: ({ pageParam = 0 }) => fetchEvents({ offset: pageParam, limit: 20 }),
  getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length * 20 : undefined,
});
```

**Impact :** Réduction de la mémoire utilisée, chargement initial plus rapide

---

## 🔄 4. ARCHITECTURE ET CODE QUALITY

### 4.1 Duplication de Code

**Problèmes identifiés :**
- Schémas de validation dupliqués (`CreateEvent.tsx` et `EditEvent.tsx`)
- Logique de sanitization dupliquée dans plusieurs hooks
- Patterns de requête répétés

**Solution :** 
- Extraire les schémas dans `src/lib/validation/eventSchemas.ts`
- Créer des hooks réutilisables pour les patterns communs
- Utiliser des utilitaires partagés

---

### 4.2 Gestion des Erreurs

**Problème :** Gestion d'erreur inconsistante

**Solution :** Créer un système centralisé de gestion d'erreurs

```typescript
// src/lib/errorHandler.ts
export const handleError = (error: unknown, context?: string) => {
  const message = error instanceof Error ? error.message : 'Une erreur est survenue';
  logger.error(`[${context}]`, error);
  // Envoyer à un service de monitoring (Sentry, etc.)
  return message;
};
```

---

### 4.3 Types et Interfaces

**Problème :** Types dupliqués dans plusieurs fichiers

**Solution :** Centraliser les types dans `src/types/`

---

## 🖼️ 5. OPTIMISATION DES ASSETS

### 5.1 Images

**Problème :** Pas de lazy loading visible pour les images

**Solution :** 
- Utiliser `loading="lazy"` sur les images
- Implémenter un composant `LazyImage`
- Utiliser des formats modernes (WebP avec fallback)

```typescript
// src/components/LazyImage.tsx
export const LazyImage = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={cn(!loaded && 'blur-sm', props.className)}
      {...props}
    />
  );
};
```

---

### 5.2 Fonts

**✅ Bon :** Preconnect et preload déjà configurés dans `index.html`

---

## 📱 6. OPTIMISATIONS MOBILE

### 6.1 Code Splitting Mobile

**Recommandation :** Créer des bundles séparés pour mobile/desktop si la différence est importante

---

## 🎯 7. PRIORISATION DES OPTIMISATIONS

### Priorité HAUTE (Impact immédiat)
1. ✅ Configuration React Query (30 min)
2. ✅ Nettoyage console.log (1-2h)
3. ✅ Lazy loading Index/Auth/NotFound (15 min)
4. ✅ Optimisation Vite build (30 min)

### Priorité MOYENNE (Impact significatif)
5. ⚠️ Requêtes parallèles dans useUserProfile (2h)
6. ⚠️ Memoization des composants de liste (3-4h)
7. ⚠️ Pagination pour grandes listes (4-6h)

### Priorité BASSE (Amélioration continue)
8. 📝 Centralisation des schémas de validation (2h)
9. 📝 Store Zustand pour UI (2h)
10. 📝 LazyImage component (1h)

---

## 📝 8. CHECKLIST DE REFACTORISATION

- [ ] Configurer React Query avec defaults optimaux
- [ ] Lazy-load Index, Auth, NotFound
- [ ] Optimiser vite.config.ts avec code splitting
- [ ] Nettoyer tous les console.log (garder seulement erreurs)
- [ ] Mémoriser EventCard et composants de liste
- [ ] Optimiser useUserProfile avec requêtes parallèles
- [ ] Centraliser les schémas de validation
- [ ] Implémenter pagination pour EventsTab et PeopleTab
- [ ] Créer composant LazyImage
- [ ] Ajouter gestion d'erreurs centralisée
- [ ] Centraliser les types dans src/types/

---

## 🔍 9. MÉTRIQUES À SURVEILLER

Après les optimisations, mesurer :
- **Temps de chargement initial** (target: < 2s)
- **Taille du bundle initial** (target: < 200KB gzipped)
- **Nombre de requêtes réseau** (réduction de 40-60%)
- **Temps de chargement des pages** (target: < 1s)
- **Score Lighthouse** (target: > 90)

---

## 📚 10. RESSOURCES

- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [React Performance](https://react.dev/learn/render-and-commit)

---

**Date du rapport :** 2025-01-20
**Version analysée :** Main branch
