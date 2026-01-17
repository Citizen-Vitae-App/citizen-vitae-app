# Guide d'Implémentation des Optimisations

## ✅ Déjà Implémenté

Les optimisations suivantes ont été appliquées automatiquement :

1. **Configuration React Query optimisée** (`src/lib/queryClient.ts`)
   - ✅ staleTime: 5 minutes
   - ✅ gcTime: 10 minutes
   - ✅ refetchOnWindowFocus: false
   - ✅ retry: 1

2. **Lazy loading amélioré** (`src/App.tsx`)
   - ✅ Index, Auth, NotFound maintenant lazy-loaded

3. **Optimisation Vite** (`vite.config.ts`)
   - ✅ Code splitting manuel par vendor
   - ✅ Optimisation des dépendances

4. **Logger conditionnel** (`src/lib/logger.ts`)
   - ✅ Prêt à remplacer console.log

---

## 🔄 À Faire Manuellement

### 1. Remplacer console.log par logger (PRIORITÉ HAUTE)

**Rechercher et remplacer dans tout le projet :**

```bash
# Rechercher tous les console.log
grep -r "console\.log" src/

# Remplacer manuellement ou avec un script
```

**Exemple de remplacement :**
```typescript
// ❌ Avant
console.log('User logged in:', user.email);

// ✅ Après
import { logger } from '@/lib/logger';
logger.log('User logged in:', user.email);
```

**Fichiers prioritaires à nettoyer :**
- `src/contexts/AuthContext.tsx` (19 console.log)
- `src/components/organization/EventsTab.tsx` (6 console.log)
- `src/pages/Index.tsx` (2 console.log)
- `src/pages/ScanParticipant.tsx` (6 console.log)

---

### 2. Mémoriser les composants de liste (PRIORITÉ MOYENNE)

**Exemple pour EventCard :**

```typescript
// src/components/EventCard.tsx
import React from 'react';

export const EventCard = React.memo(({ event, ...props }) => {
  // ... code existant
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.updated_at === nextProps.event.updated_at &&
    prevProps.event.cover_image_url === nextProps.event.cover_image_url
  );
});

EventCard.displayName = 'EventCard';
```

**Composants à mémoriser :**
- `EventCard`
- `OrganizationCard` (si existe)
- Composants de liste dans `EventsTab`, `PeopleTab`

---

### 3. Optimiser useUserProfile (PRIORITÉ MOYENNE)

**Créer une fonction RPC Supabase :**

```sql
-- Dans Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_org_member_counts(org_ids uuid[])
RETURNS TABLE(organization_id uuid, member_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id, COUNT(*)::bigint as member_count
  FROM organization_members om
  WHERE om.organization_id = ANY(org_ids)
  GROUP BY om.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Puis modifier `src/hooks/useUserProfile.tsx` :**

```typescript
// Au lieu de Promise.all avec des requêtes individuelles
const { data: memberCounts } = await supabase.rpc('get_org_member_counts', {
  org_ids: memberships.map(m => (m.organizations as any).id)
});

// Créer un Map pour lookup rapide
const countMap = new Map(
  (memberCounts || []).map(mc => [mc.organization_id, mc.member_count])
);

const orgsWithCounts = memberships.map(m => {
  const org = m.organizations as any;
  return {
    id: org.id,
    name: org.name,
    logo_url: org.logo_url,
    type: org.type || 'association',
    role: m.role,
    is_owner: m.is_owner || false,
    member_count: countMap.get(org.id) || 0,
  };
});
```

---

### 4. Centraliser les schémas de validation (PRIORITÉ BASSE)

**Créer `src/lib/validation/eventSchemas.ts` :**

```typescript
import { z } from 'zod';

export const eventNameSchema = z.string()
  .min(3, 'Le nom doit contenir au moins 3 caractères')
  .max(200, 'Le nom ne peut pas dépasser 200 caractères')
  .regex(/^[\w\s\-àéèêëïîôùûüÿçÀÉÈÊËÏÎÔÙÛÜŸÇ',.!?&()]+$/i, 'Le nom contient des caractères non autorisés');

export const eventLocationSchema = z.string()
  .min(3, 'Lieu requis')
  .max(500, 'L\'adresse ne peut pas dépasser 500 caractères');

export const eventCapacitySchema = z.string()
  .optional()
  .refine(val => !val || /^\d+$/.test(val), 'La capacité doit être un nombre')
  .refine(val => !val || parseInt(val) > 0, 'La capacité doit être supérieure à 0')
  .refine(val => !val || parseInt(val) <= 100000, 'La capacité ne peut pas dépasser 100 000');

export const eventSchema = z.object({
  name: eventNameSchema,
  startDate: z.date({ required_error: 'Date de début requise' }),
  startTime: z.string().min(1, 'Heure de début requise'),
  endDate: z.date({ required_error: 'Date de fin requise' }),
  endTime: z.string().min(1, 'Heure de fin requise'),
  location: eventLocationSchema,
  description: z.string().max(10000, 'La description est trop longue').optional(),
  capacity: eventCapacitySchema,
  requireApproval: z.boolean().default(false),
  allowSelfCertification: z.boolean().default(false),
});

export type EventFormData = z.infer<typeof eventSchema>;
```

**Puis utiliser dans `CreateEvent.tsx` et `EditEvent.tsx` :**

```typescript
import { eventSchema, type EventFormData } from '@/lib/validation/eventSchemas';
```

---

### 5. Implémenter la pagination (PRIORITÉ MOYENNE)

**Exemple pour EventsTab :**

```typescript
// src/hooks/useOrganizationEvents.tsx
import { useInfiniteQuery } from '@tanstack/react-query';

export const useOrganizationEventsPaginated = (
  organizationId: string | null,
  teamId?: string,
  pageSize = 20
) => {
  return useInfiniteQuery({
    queryKey: ['organization-events', organizationId, teamId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!organizationId) return { events: [], hasMore: false };

      const { data, error } = await supabase
        .from('events')
        .select('*, organizations!inner (name)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true })
        .range(pageParam, pageParam + pageSize - 1);

      if (error) throw error;

      return {
        events: data || [],
        hasMore: (data?.length || 0) === pageSize,
      };
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * pageSize : undefined;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
};
```

---

## 📊 Mesures de Performance

### Avant les optimisations
- Bundle initial: ~XXX KB
- Requêtes réseau: ~XX par page
- Temps de chargement: ~X.Xs

### Après les optimisations (attendu)
- Bundle initial: -15-20% (lazy loading)
- Requêtes réseau: -40-60% (React Query config)
- Temps de chargement: -30-50%

---

## 🧪 Tests à Effectuer

1. **Test de chargement initial**
   - Ouvrir DevTools → Network
   - Vider le cache (Cmd+Shift+R)
   - Mesurer le temps jusqu'à "DOMContentLoaded"

2. **Test de navigation**
   - Naviguer entre les pages
   - Vérifier qu'il n'y a pas de refetch inutile
   - Vérifier que les données sont bien mises en cache

3. **Test de performance**
   - Lighthouse (Chrome DevTools)
   - Target: Score > 90

---

## 📝 Checklist de Migration

- [x] Configuration React Query
- [x] Lazy loading Index/Auth/NotFound
- [x] Optimisation Vite
- [x] Logger conditionnel créé
- [ ] Remplacer console.log par logger (à faire)
- [ ] Mémoriser EventCard (à faire)
- [ ] Optimiser useUserProfile (à faire)
- [ ] Centraliser schémas validation (à faire)
- [ ] Implémenter pagination (à faire)

---

## 🚨 Notes Importantes

1. **Tester après chaque changement** pour s'assurer que rien ne casse
2. **Faire les changements par étapes** (un fichier à la fois)
3. **Garder les console.error** pour les erreurs critiques
4. **Ne pas supprimer tous les console.log d'un coup** - faire progressivement

---

**Dernière mise à jour :** 2025-01-20
