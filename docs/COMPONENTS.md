# 📚 Documentation des Composants Principaux

## 🎯 Composants Métier Critiques

### 1. **ProjectCard** (`/components/ProjectCard.tsx`)
**Description**: Carte d'affichage des projets avec statut, budget et actions.

**Props**:
- `project`: Objet projet avec id, title, description, status, etc.
- `onStatusToggle`: Callback pour changer le statut (play/pause)
- `onDelete`: Callback pour supprimer le projet
- `onView`: Callback pour voir les détails/créer les équipes
- `onStart`: Callback optionnel pour démarrer le projet
- `refreshTrigger`: Number optionnel pour forcer le refresh

**Utilisation**:
```tsx
<ProjectCard 
  project={project}
  onView={(id) => navigate(`/project/${id}`)}
  onStatusToggle={handleStatusToggle}
  onDelete={handleDelete}
/>
```

### 2. **SharedMessageSystem** (`/components/shared/SharedMessageSystem.tsx`)
**Description**: Système de messagerie unifié avec threads, upload de fichiers et temps réel.

**Props**:
- `projectId`: ID du projet pour filtrer les messages
- `userType`: Type d'utilisateur ('client' | 'candidate' | 'admin')
- `onNewMessage?`: Callback quand un nouveau message est reçu

**Utilisation**:
```tsx
<SharedMessageSystem 
  projectId={selectedProjectId} 
  userType="client" 
/>
```

### 3. **KanbanBoard** (`/components/kanban/KanbanBoard.tsx`)
**Description**: Tableau Kanban avec drag & drop, gestion des cartes et colonnes.

**Props**:
- `projectId`: ID du projet
- `onCardMove`: Callback lors du déplacement d'une carte
- `onCardCreate`: Callback lors de la création d'une carte
- `onCardUpdate`: Callback lors de la mise à jour d'une carte
- `onCardDelete`: Callback lors de la suppression d'une carte

**Utilisation**:
```tsx
<KanbanBoard 
  projectId={projectId}
  onCardMove={handleCardMove}
  onCardCreate={handleCardCreate}
/>
```

### 4. **CandidateOnboarding** (`/components/candidate/CandidateOnboarding.tsx`)
**Description**: Processus d'onboarding multi-étapes pour les candidats.

**Props**:
- `candidateId`: ID du candidat
- `onComplete`: Callback à la fin de l'onboarding
- `completeOnboarding`: Fonction async pour sauvegarder les données

**Utilisation**:
```tsx
<CandidateOnboarding 
  candidateId={candidateProfile.id}
  completeOnboarding={completeOnboarding}
  onComplete={() => refetchProfile()}
/>
```

### 5. **HRResourceNode** (`/components/hr/HRResourceNode.tsx`)
**Description**: Nœud ReactFlow pour représenter une ressource HR dans le graph.

**Props**:
- `data`: Données du nœud (profile, isSelected, onSelect, etc.)
- `id`: ID unique du nœud
- `selected`: État de sélection

**Caractéristiques**:
- Affiche avatar, nom, rôle et compétences
- Indicateurs visuels pour la séniorité et le statut
- Handles pour connexions entrantes/sortantes

## 🔧 Composants d'Infrastructure

### 6. **AuthProvider** (`/contexts/AuthContext.tsx`)
**Description**: Context Provider pour l'authentification globale.

**Valeurs fournies**:
- `user`: Objet utilisateur courant
- `loading`: État de chargement
- `signIn`: Fonction de connexion
- `signUp`: Fonction d'inscription
- `logout`: Fonction de déconnexion
- `refreshUser`: Rafraîchir les données utilisateur

### 7. **ProtectedRoute** (`/components/auth/ProtectedRoute.tsx`)
**Description**: Wrapper pour protéger les routes nécessitant une authentification.

**Props**:
- `children`: Composant enfant à protéger
- `requiredRole?`: Rôle requis (optionnel)

### 8. **ErrorBoundary** (`/components/ErrorBoundary.tsx`)
**Description**: Capture les erreurs React et affiche un fallback.

**Props**:
- `children`: Composants enfants
- `fallback?`: Composant de fallback personnalisé

## 🎨 Composants UI Réutilisables

### 9. **IallaLogo** (`/components/IallaLogo.tsx`)
**Description**: Logo Ialla avec différentes tailles.

**Props**:
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `className?`: Classes CSS additionnelles

### 10. **NotificationCenter** (`/components/notifications/NotificationCenter.tsx`)
**Description**: Centre de notifications avec badge et liste déroulante.

**Features**:
- Notifications en temps réel
- Marquage comme lu
- Filtrage par type
- Badge avec compteur

## 📁 Structure des Composants Partagés

### Pattern Wrapper utilisé:
```
SharedComponent (logique partagée)
  ├── ClientWrapper (fetch données client)
  └── CandidateWrapper (fetch données candidat)
```

**Exemples**:
- `SharedDriveView` → `DriveView` (Client) & `CandidateDriveView` (Candidat)
- `SharedPlanningView` → `PlanningView` (Client) & `CandidatePlanningView` (Candidat)
- `SharedMessageSystem` → Utilisé directement par tous

## 🚀 Hooks Personnalisés Importants

### 1. **useAuth** (`/contexts/AuthContext.tsx`)
Accès au contexte d'authentification.

### 2. **useRealtimeProjectsFixed** (`/hooks/useRealtimeProjectsFixed.ts`)
Synchronisation temps réel des projets et assignments.

### 3. **useKanbanSupabase** (`/hooks/useKanbanSupabase.ts`)
Gestion des opérations Kanban avec Supabase.

### 4. **useCandidateProjects** (`/hooks/useCandidateProjects.ts`)
Récupération des projets du candidat.

### 5. **useProjectFiles** (`/hooks/useProjectFiles.ts`)
Gestion des fichiers de projet.

## 📋 Conventions de Code

### Naming:
- **Composants**: PascalCase (`ProjectCard`)
- **Hooks**: camelCase avec préfixe `use` (`useAuth`)
- **Fichiers**: PascalCase pour composants, camelCase pour utils
- **Props interfaces**: `ComponentNameProps`

### Structure des fichiers:
```tsx
// 1. Imports
import { ... } from 'react';
import { ... } from '@/components/ui/...';
import { ... } from '@/lib/...';

// 2. Types/Interfaces
interface ComponentProps {
  ...
}

// 3. Composant principal
export function Component({ props }: ComponentProps) {
  // Hooks
  // États
  // Effets
  // Handlers
  // Render
}

// 4. Sous-composants (si nécessaire)
```

### Styles:
- Utilisation de Tailwind CSS
- Classes utilitaires plutôt que CSS custom
- Gradients Ialla: `from-blue-600 to-purple-600`

## 🔄 Flux de Données

```
Supabase ←→ Hooks ←→ Composants ←→ UI
     ↑                    ↓
     └── Realtime ←→ State Management
```

## 🎯 Bonnes Pratiques

1. **Séparation des responsabilités**: Logique métier dans les hooks, présentation dans les composants
2. **Composition**: Préférer la composition à l'héritage
3. **Props minimales**: Passer uniquement les props nécessaires
4. **Memoization**: Utiliser `useMemo` et `useCallback` pour les calculs coûteux
5. **Error Handling**: Toujours gérer les erreurs avec try/catch et toast
6. **Loading States**: Toujours afficher un état de chargement
7. **TypeScript**: Typer toutes les props et retours de fonction