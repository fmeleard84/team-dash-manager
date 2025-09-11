# Guide d'utilisation du hook universel `useProjectSort`

Ce guide explique comment utiliser le hook `useProjectSort` pour standardiser l'affichage et le tri des projets dans toute l'application.

## 📋 Fonctionnalités

- **Tri automatique** par date de création (plus récent en premier)
- **Formatage uniforme** avec titre + date de création
- **Type safety** avec TypeScript
- **Réutilisable** dans tous les composants

## 🚀 Usage de base

### Import du hook

```typescript
import { useProjectSort, type ProjectWithDate } from '@/hooks/useProjectSort';
```

### Dans un composant avec Select

```typescript
const MyComponent = ({ projects }: { projects: ProjectWithDate[] }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Tri automatique des projets
  const sortedProjects = useProjectSort(projects);
  
  return (
    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner un projet" />
      </SelectTrigger>
      <SelectContent>
        {sortedProjects.map(project => (
          <SelectItem key={project.id} value={project.id}>
            {project.displayText}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Avec filtrage de projets actifs

```typescript
const MyDashboard = ({ allProjects }: { allProjects: ProjectWithDate[] }) => {
  // Filtrer d'abord, puis trier
  const activeProjects = allProjects.filter(p => p.status === 'play') as ProjectWithDate[];
  const sortedActiveProjects = useProjectSort(activeProjects);
  
  return (
    <div>
      <h2>Projets actifs ({sortedActiveProjects.length})</h2>
      {/* ... rest of component */}
    </div>
  );
};
```

## 📝 Structure des données

Le hook attend des objets avec cette structure minimum :

```typescript
interface ProjectWithDate {
  id: string;
  title: string;
  created_at: string; // ISO date string
  [key: string]: any; // Autres propriétés optionnelles
}
```

Le hook retourne :

```typescript
interface SortedProjectOption {
  id: string;
  title: string;
  created_at: string;
  displayText: string; // "Projet Alpha • 15 janv. 2024"
  formattedDate: string; // "15 janv. 2024"
}
```

## 📍 Composants déjà mis à jour

- ✅ `PlanningPage.tsx` - Page Planning principale
- ✅ `ClientDashboard.tsx` - Sélecteurs Kanban, Messages, Drive, Wiki

## 🎯 Composants à mettre à jour

Les composants suivants contiennent des sélecteurs de projets et devraient utiliser ce hook :

1. **Pages principales :**
   - `ClientMetricsDashboard.tsx`
   - `CandidateDashboard.tsx` 
   - `CandidateActivities.tsx`
   - `CandidateRatings.tsx`

2. **Composants partagés :**
   - `SharedDriveView.tsx`
   - `SharedPlanningView.tsx`
   - `OptimizedDriveView.tsx`

3. **Composants spécialisés :**
   - `ClientKanbanView.tsx`
   - `CandidateKanbanView.tsx`
   - `CandidateMessagesView.tsx`
   - `CandidatePayments.tsx`
   - `InvoiceList.tsx`

## 🔧 Fonction utilitaire

Si vous n'avez besoin que du formatage sans le tri :

```typescript
import { formatProjectOption } from '@/hooks/useProjectSort';

const displayText = formatProjectOption(project);
// Résultat : "Mon Projet • 15 janv. 2024"
```

## ✨ Avantages

1. **Cohérence** - Tous les sélecteurs de projets ont le même format
2. **Tri standardisé** - Projets toujours dans l'ordre chronologique inverse
3. **Maintenance** - Une seule logique de tri/formatage à maintenir
4. **UX améliorée** - Les utilisateurs voient immédiatement la date de création

## 🎨 Format de date

Le format utilisé est `fr-FR` avec :
- Jour numérique
- Mois abrégé 
- Année complète

Exemples :
- `15 janv. 2024`
- `3 déc. 2023`
- `28 févr. 2024`