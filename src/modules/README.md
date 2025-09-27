# 🏗️ Architecture Modulaire - Team Dash Manager

## 📋 Vue d'Ensemble

Cette nouvelle architecture modulaire reorganise le projet par **fonctionnalités métier** plutôt que par type technique, permettant :

- ✅ **Éviter les régressions** lors des modifications
- ✅ **Évolution indépendante** de chaque module
- ✅ **Maintenance simplifiée** avec des responsabilités claires
- ✅ **Performance améliorée** avec du code splitting naturel
- ✅ **Tests ciblés** par domaine fonctionnel

## 🏢 Structure des Modules

```
src/modules/
├── projets/           # ✅ COMPLÉTÉ
│   ├── components/    # Composants UI spécifiques aux projets
│   ├── hooks/         # Logique métier et état
│   ├── services/      # Appels API et logique serveur
│   ├── types/         # Types TypeScript
│   ├── utils/         # Utilitaires spécifiques
│   └── index.ts       # Point d'entrée du module
│
├── kanban/            # 🚧 À MIGRER
├── planning/          # 🚧 À MIGRER
├── messages/          # 🚧 À MIGRER
├── drive/             # 🚧 À MIGRER
├── wiki/              # 🚧 À MIGRER
├── video/             # 🚧 À MIGRER
└── parametres/        # 🚧 À MIGRER
```

## 🎯 Module PROJETS - COMPLÉTÉ ✅

### Fonctionnalités Implémentées

#### 🔧 Services API (`services/projetAPI.ts`)
- `getProjects()` - Liste des projets avec filtres
- `getCandidateProjects()` - Projets spécifiques candidat
- `getClientProjects()` - Projets spécifiques client
- `getProjectById()` - Récupération projet par ID
- `createProject()` - Création nouveau projet
- `updateProject()` - Mise à jour projet
- `deleteProject()` - Suppression (soft delete)
- `getProjectMembers()` - Équipe du projet
- `getResourceAssignments()` - Assignations ressources
- `getHRProfiles()` - Profils métiers disponibles

#### 🎣 Hooks React (`hooks/`)
- `useProjects()` - Liste générale avec filtres
- `useCandidateProjects()` - Projets candidat avec RLS
- `useClientProjects()` - Projets client
- `useProjectMembers()` - Équipe projet (IA + Humains)
- `useProjectActions()` - Actions CRUD (créer, modifier, supprimer)

#### 🧩 Composants (`components/`)
- `CandidateProjectsSection` - Vue candidat modernisée
- Support complet IA/Humains
- Modal détails avec équipe et fichiers
- Filtres par statut
- Design system cohérent

#### 📝 Types (`types/index.ts`)
- `Project` - Structure projet
- `ProjectMember` - Membre d'équipe unifié
- `ResourceAssignment` - Assignation ressource
- `HRProfile` - Profil métier
- `ProjectFilters` - Filtres et recherche
- `CreateProjectData` - Données création
- `UpdateProjectData` - Données mise à jour

### 🔄 Compatibilité

Le module PROJETS est **100% rétrocompatible** :

```tsx
// ✅ Ancienne méthode (continue de fonctionner)
import { CandidateProjectsSection } from '@/components/candidate/CandidateProjectsSection';

// ✅ Nouvelle méthode (recommandée)
import { CandidateProjectsSection } from '@/modules/projets';

// ✅ Hooks spécialisés (nouveau)
import { useCandidateProjects, useProjectMembers } from '@/modules/projets';
```

### 🧪 Tests Disponibles

- `test-modular-migration.tsx` - Test de compatibilité et comparaison
- Validation TypeScript ✅
- HMR (Hot Module Replacement) ✅
- Serveur de développement ✅

## 📈 Avantages Démontrés

### Performance
- **Appels API optimisés** : Un seul hook pour les projets candidat
- **Chargement intelligent** : RLS intégrée dans les services
- **Cache natif** : useState + useCallback pour réduire les re-renders

### Maintenabilité
- **Responsabilité unique** : Chaque module gère son domaine
- **Couplage faible** : Interfaces claires entre modules
- **Code DRY** : Réutilisation via les services centralisés

### Développement
- **Pas d'appels Supabase directs** dans les composants
- **Séparation claire** : UI / Logique / API
- **Types stricts** : Sécurité TypeScript renforcée

## 🚀 Prochaines Étapes

### Phase 2 - KANBAN (Priorité)
```bash
src/modules/kanban/
├── services/kanbanAPI.ts    # Boards, Cards, Columns
├── hooks/useKanban.ts       # État Kanban temps réel
├── components/KanbanBoard.tsx
└── types/index.ts
```

### Phase 3 - MESSAGES
```bash
src/modules/messages/
├── services/messageAPI.ts   # WebSocket + Supabase
├── hooks/useMessages.ts     # Temps réel
├── components/MessageSystem.tsx
└── types/index.ts
```

### Phase 4 - DRIVE
```bash
src/modules/drive/
├── services/driveAPI.ts     # Upload, folders, files
├── hooks/useDrive.ts        # État fichiers
├── components/DriveView.tsx
└── types/index.ts
```

## 📋 Checklist Migration Module

Pour chaque nouveau module :

- [ ] 🏗️ Créer structure de dossiers
- [ ] 📝 Définir types TypeScript
- [ ] 🔌 Implémenter service API
- [ ] 🎣 Créer hooks React
- [ ] 🧩 Migrer composants existants
- [ ] 🧪 Créer tests de compatibilité
- [ ] 📚 Documenter usage
- [ ] ✅ Valider TypeScript
- [ ] 🔄 Tester rétrocompatibilité

## 🎯 Règles d'Architecture

### ✅ À FAIRE
- **Centralisiser la logique API** dans les services
- **Utiliser les hooks** pour l'état et les effets
- **Typer strictement** toutes les interfaces
- **Garder la rétrocompatibilité** pendant la migration
- **Documenter** les changements d'API

### ❌ À ÉVITER
- **Appels Supabase directs** dans les composants
- **Logique métier** dans l'UI
- **Breaking changes** sans version de transition
- **Modules trop couplés** entre eux
- **Code dupliqué** entre modules

## 📊 État Actuel

| Module | Statut | Services | Hooks | Components | Tests |
|--------|--------|----------|-------|------------|-------|
| **PROJETS** | ✅ Complété | ✅ | ✅ | ✅ | ✅ |
| KANBAN | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| MESSAGES | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| DRIVE | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| PLANNING | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| WIKI | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| VIDEO | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| PARAMETRES | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |

---

> 💡 **Note** : Cette architecture respecte les principes SOLID et facilite la maintenance à long terme. Chaque module peut évoluer indépendamment sans affecter les autres.