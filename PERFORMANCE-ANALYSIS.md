# 🚨 ANALYSE DE PERFORMANCE - Dashboard Team Manager

## 📊 Problème Identifié
- **253 requêtes HTTP** au chargement
- **16.8 MB transférés**
- **20 secondes** de temps de chargement
- Affecte les dashboards Client ET Candidat

## 🔍 Causes Principales Identifiées

### 1. **Hook `useProjectsWithResources` - Surutilisation**
```typescript
// ClientDashboard.tsx ligne 109-115
const {
  projects: enrichedProjects,
  archivedProjects,
  loading: projectsLoading,
  refresh: refreshProjects,
  stats: projectStats
} = useProjectsWithResources(user?.id, 'client');
```

**Problèmes:**
- Charge TOUS les projets (actifs + archivés)
- Pour CHAQUE projet, charge TOUTES les resource_assignments
- Active le realtime sur TOUTES les tables
- Fait du polling toutes les 30 secondes

### 2. **Multiples Hooks Parallèles**
Le ClientDashboard utilise simultanément:
- `useProjectsWithResources` - Charge tous les projets
- `useTemplates` - Charge tous les templates
- `useClientCredits` - Charge les crédits
- `useProjectSelector` - Charge encore les projets
- `useProjectOrchestrator` - Gestion projet
- `useAuth` - Vérification auth
- `useTranslation` - Traductions

### 3. **Composants Lourds Chargés d'Office**
Même si non visibles, ces composants sont montés:
- `SimpleDriveView` - Charge les fichiers
- `ClientKanbanView` - Charge le kanban
- `EnhancedMessageSystemNeon` - Charge les messages
- `InvoiceList` - Charge les factures
- `ClientMetricsDashboard` - Charge les métriques
- `PlanningPage` - Charge le planning
- `WikiView` - Charge le wiki

### 4. **Realtime Subscriptions Multiples**
```typescript
// useProjectsWithResources.ts lignes 175-200
.channel('all-projects-changes')
.on('postgres_changes', { table: 'projects' })
.on('postgres_changes', { table: 'hr_resource_assignments' })
```
Chaque composant crée ses propres subscriptions realtime.

### 5. **Requêtes N+1**
Pour chaque projet, on charge:
- Les resource_assignments
- Les hr_profiles
- Les candidate_profiles
- Les fichiers attachés
- Les messages
- Les events

## 💡 Solutions Proposées

### Solution 1: **Lazy Loading des Composants**
```typescript
// Au lieu de :
import ClientKanbanView from "@/components/client/ClientKanbanView";

// Utiliser :
const ClientKanbanView = lazy(() => import("@/components/client/ClientKanbanView"));

// Et afficher avec Suspense :
{activeSection === 'kanban' && (
  <Suspense fallback={<Spinner />}>
    <ClientKanbanView projectId={selectedKanbanProjectId} />
  </Suspense>
)}
```

### Solution 2: **Pagination des Projets**
```typescript
// Limiter à 10 projets par défaut
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .range(0, 9)  // Pagination
  .order('created_at', { ascending: false });
```

### Solution 3: **Cache et Memoization**
```typescript
// Utiliser React Query ou SWR pour le cache
import { useQuery } from '@tanstack/react-query';

const { data: projects } = useQuery({
  queryKey: ['projects', userId],
  queryFn: fetchProjects,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
});
```

### Solution 4: **Requête Unique Optimisée**
```typescript
// Une seule requête pour tout récupérer
const { data } = await supabase
  .rpc('get_dashboard_data', { user_id: userId })
  // Fonction PostgreSQL qui fait les jointures côté serveur
```

### Solution 5: **Debounce et Throttle**
```typescript
// Pour les updates realtime
import { debounce } from 'lodash';

const debouncedRefresh = debounce(fetchProjectsAndResources, 1000);
```

### Solution 6: **Virtual Scrolling**
Pour les listes longues:
```typescript
import { VariableSizeList } from 'react-window';
```

## 🎯 Plan d'Action Immédiat

1. **Phase 1 - Quick Wins** (30 min)
   - [ ] Implémenter lazy loading pour tous les composants de section
   - [ ] Ajouter pagination aux projets (limit 10)
   - [ ] Désactiver le polling automatique

2. **Phase 2 - Optimisations** (2h)
   - [ ] Créer un hook unique `useDashboardData` qui fait une seule requête
   - [ ] Implémenter React Query pour le cache
   - [ ] Réduire les subscriptions realtime à 1 seule

3. **Phase 3 - Refactoring** (4h)
   - [ ] Créer une fonction PostgreSQL `get_client_dashboard_data`
   - [ ] Implémenter le virtual scrolling
   - [ ] Optimiser les images et assets

## 📈 Résultats Attendus

Après optimisation:
- **Requêtes**: 253 → ~20 requêtes
- **Données**: 16.8 MB → ~2 MB
- **Temps**: 20s → ~2-3s
- **Performance Score**: 40 → 90+

## 🔧 Code à Modifier

### Fichiers Prioritaires:
1. `/src/hooks/useProjectsWithResources.ts` - Optimiser les requêtes
2. `/src/pages/ClientDashboard.tsx` - Lazy loading
3. `/src/pages/CandidateDashboard.tsx` - Lazy loading
4. `/src/hooks/useCandidateProjectsOptimized.ts` - Pagination

### Nouveau Hook Proposé:
```typescript
// /src/hooks/useDashboardData.ts
export const useDashboardData = (userId: string, role: 'client' | 'candidate') => {
  return useQuery({
    queryKey: ['dashboard', userId, role],
    queryFn: async () => {
      // Une seule requête optimisée
      const { data } = await supabase
        .rpc('get_dashboard_data', {
          user_id: userId,
          user_role: role,
          limit: 10
        });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false // Pas de polling auto
  });
};
```