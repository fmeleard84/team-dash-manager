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

## 🎯 Module KANBAN - COMPLÉTÉ ✅

### Fonctionnalités Implémentées

#### 🔧 Services API (`services/kanbanAPI.ts`)
- `getProjectBoards()` - Liste des boards d'un projet
- `getBoardById()` - Board complet avec colonnes et cartes
- `createBoard()` - Création board avec colonnes par défaut
- `updateBoard()` - Mise à jour board et settings
- `deleteBoard()` - Suppression (soft delete)
- `createColumn()` - Nouvelle colonne avec position automatique
- `updateColumn()` - Modification colonne (titre, couleur, limites WIP)
- `deleteColumn()` - Suppression avec validation cartes
- `createCard()` - Nouvelle carte avec position automatique
- `updateCard()` - Mise à jour complète carte
- `moveCard()` - Déplacement drag & drop avec réorganisation
- `deleteCard()` - Suppression carte
- `getCardComments()` - Commentaires avec profils utilisateurs
- `addComment()` - Nouveau commentaire
- `getBoardStats()` - Statistiques complètes (progression, répartition)
- `getBoardMembers()` - Équipe projet (IA + Humains)

#### 🎣 Hooks React (`hooks/`)
- `useKanbanBoard()` - Board complet avec chargement intelligent
- `useProjectKanbanBoards()` - Tous les boards d'un projet
- `useKanbanActions()` - Actions CRUD (board, colonnes, cartes)
- `useKanbanComments()` - Gestion commentaires temps réel
- `useKanbanStats()` - Statistiques board
- `useKanbanMembers()` - Membres équipe avec rôles

#### 🧩 Composants (`components/`)
- `ModularKanbanBoard` - Board principal avec drag & drop
- Support complet filtres (recherche, utilisateur)
- Gestion équipe avec avatars
- Statistiques temps réel
- Créations rapides (colonnes/cartes)
- Réexport composants existants (transition douce)

#### 📝 Types (`types/index.ts`)
- `KanbanBoard` - Structure board complète
- `KanbanColumn` - Colonne avec limites WIP et couleurs
- `KanbanCard` - Carte enrichie (priorité, progress, estimations)
- `KanbanComment` - Commentaires avec mentions
- `KanbanAttachment` - Fichiers attachés
- `KanbanStats` - Métriques et analytics
- `TeamMember` - Membre unifié (IA + Humains)
- Types CRUD complets pour toutes les actions
- Types pour filtres, recherche et événements temps réel

### 🔄 Compatibilité KANBAN

Le module KANBAN est **100% rétrocompatible** :

```tsx
// ✅ Ancienne méthode (continue de fonctionner)
import { KanbanBoard } from '@/components/kanban/KanbanBoard';

// ✅ Nouvelle méthode (recommandée)
import { ModularKanbanBoard, useKanbanBoard, KanbanAPI } from '@/modules/kanban';

// ✅ Hooks spécialisés (nouveau)
import { useKanbanActions, useKanbanStats } from '@/modules/kanban';
```

### 🚀 Avantages KANBAN

#### Performance
- **Chargement optimisé** : Un seul appel pour board + colonnes + cartes
- **Drag & drop intelligent** : Réorganisation automatique des positions
- **Cache hooks** : Réduction des re-renders avec useState + useCallback

#### Fonctionnalités
- **Statistiques temps réel** : Progression, répartition, tâches en retard
- **Gestion équipe** : Support IA et humains unifié
- **Limites WIP** : Work In Progress par colonne
- **Commentaires** : Système de commentaires avec mentions
- **Filtres avancés** : Recherche, utilisateur, labels

#### Maintenabilité
- **API centralisée** : Toute la logique Supabase dans KanbanAPI
- **Types stricts** : Sécurité TypeScript complète
- **Hooks réutilisables** : Logique métier partageable

## 🎯 Module MESSAGES - COMPLÉTÉ ✅

### Fonctionnalités Implémentées

#### 🔧 Services API (`services/messageAPI.ts`)
- `getProjectThreads()` - Liste des threads d'un projet avec filtres
- `getThreadById()` - Thread complet avec participants
- `createThread()` - Nouveau thread avec message initial
- `updateThread()` - Mise à jour thread et paramètres
- `deleteThread()` - Suppression (soft delete) avec archivage
- `getThreadMessages()` - Messages avec attachements et profils
- `sendMessage()` - Nouveau message avec mentions et fichiers
- `updateMessage()` - Édition messages avec historique
- `deleteMessage()` - Suppression message (soft delete)
- `addParticipant()` - Ajout participant avec rôle
- `addParticipants()` - Ajout multiple participants
- `removeParticipant()` - Retrait participant du thread
- `markMessagesAsRead()` - Marquage lu par utilisateur
- `getProjectMessageStats()` - Statistiques complètes projet
- `searchMessages()` - Recherche full-text avancée

#### 🎣 Hooks React (`hooks/`)
- `useMessages()` - Messages thread avec filtres intelligents
- `useMessageThreads()` - Threads projet avec recherche
- `useMessageStats()` - Statistiques temps réel
- `useMessageActions()` - Actions CRUD avec gestion erreurs
- `useRealtimeMessages()` - WebSocket avec typing indicators

#### 🧩 Composants (`components/`)
- `EnhancedMessageSystem` - Interface complète moderne
- Sidebar threads avec recherche et stats
- Zone messages avec scroll automatique
- Indicateurs de typing en temps réel
- Interface adaptive desktop/mobile
- Support mentions et attachements
- Notifications toast intégrées

#### 📝 Types (`types/index.ts`)
- `MessageThread` - Threads avec paramètres et participants
- `Message` - Messages enrichis (mentions, réactions, éditions)
- `MessageParticipant` - Participants avec rôles et notifications
- `MessageAttachment` - Fichiers avec métadonnées complètes
- `TypingIndicator` - Indicateurs temps réel
- `MessageStats` - Analytics et métriques
- `AIAssistant` - Intégration IA avec prompts personnalisés
- `MessageNotification` - Système notifications
- Types CRUD et réaltime complets

### 🔄 Compatibilité MESSAGES

Le module MESSAGES est **100% rétrocompatible** :

```tsx
// ✅ Ancienne méthode (continue de fonctionner)
import { EnhancedMessageSystemNeon } from '@/components/shared/EnhancedMessageSystemNeon';

// ✅ Nouvelle méthode (recommandée)
import { EnhancedMessageSystem, useMessages, MessageAPI } from '@/modules/messages';

// ✅ Hooks spécialisés (nouveau)
import { useRealtimeMessages, useMessageActions } from '@/modules/messages';
```

### 🚀 Avantages MESSAGES

#### Performance
- **Chargement optimisé** : Requêtes avec jointures intelligentes
- **Réaltime efficace** : WebSocket avec channels spécialisés
- **Scroll intelligent** : Auto-scroll et pagination lazy

#### Fonctionnalités
- **Temps réel complet** : Messages, typing, présence
- **Recherche avancée** : Full-text avec filtres multiples
- **Système mentions** : @utilisateur avec notifications
- **Attachements** : Upload avec preview et métadonnées
- **Threads typés** : General, privé, annonces, support, IA
- **Statistiques** : Analytics complètes par projet
- **Notifications** : Toast et système de notifications

#### Collaboration
- **Équipe unifiée** : IA et humains avec rôles
- **Typing indicators** : En temps réel par thread
- **Présence utilisateurs** : Online/offline avec activité
- **Assistant IA** : Réponses automatiques configurables
- **Modération** : Édition, suppression, archivage

#### Maintenabilité
- **API centralisée** : Toute la logique dans MessageAPI
- **WebSocket unifié** : Gestion réaltime centralisée
- **Types stricts** : Sécurité TypeScript complète
- **Hooks réutilisables** : Logique métier partageable

## 🎯 Module DRIVE - COMPLÉTÉ ✅

### Fonctionnalités Implémentées

#### 🔧 Services API (`services/driveAPI.ts`)
- `getProjectDrives()` - Liste des drives d'un projet avec statistiques
- `getDriveById()` - Drive complet avec nœuds et navigation
- `createDrive()` - Création drive avec dossier racine automatique
- `updateDrive()` - Mise à jour drive et paramètres
- `deleteDrive()` - Suppression (soft delete) avec cascade sur nœuds
- `createFolder()` - Nouveau dossier avec métadonnées et logging
- `updateNode()` - Modification fichier/dossier avec historique
- `moveNode()` - Déplacement drag & drop avec logging d'activité
- `deleteNode()` - Suppression avec tracking utilisateur
- `uploadFile()` - Upload chunked avec checksums et vignettes
- `downloadFile()` - URLs signées avec contrôle d'accès
- `shareNode()` - Partage granulaire (user, group, public, link)
- `searchFiles()` - Recherche full-text avec scores de pertinence
- `getDriveStats()` - Statistiques complètes (stockage, usage, types)
- `getDriveActivity()` - Journal d'activité avec profils utilisateurs

#### 🎣 Hooks React (`hooks/`)
- `useDrive()` - Navigation complète avec breadcrumb et auto-refresh
- `useProjectDrives()` - Gestion tous les drives d'un projet
- `useDriveActions()` - Actions CRUD avec gestion d'erreurs centralisée
- `useDriveSearch()` - Recherche avancée avec debouncing et historique
- `useDriveStats()` - Analytics et métriques temps réel

#### 🧩 Composants (`components/`)
- `ModularDriveView` - Interface complète avec drag & drop natif
- Navigation breadcrumb avec fil d'Ariane
- Recherche intelligente avec filtres avancés
- Sélection multiple et actions bulk
- Vues grille et liste adaptatives
- Upload multi-fichiers avec progression
- Statistiques temps réel intégrées
- Réexport composants existants (transition douce)

#### 📝 Types (`types/index.ts`)
- `Drive` - Structure drive complète avec quotas et paramètres
- `DriveNode` - Fichiers/dossiers avec métadonnées enrichies
- `DriveUpload` - Gestion upload chunked avec progression
- `DriveShare` - Partage granulaire avec permissions et tokens
- `DriveActivity` - Journal d'activité avec métadonnées
- `DriveStats` - Analytics complètes (usage, répartition, tendances)
- `DriveFilters` - Filtres de recherche avancés
- `DriveSearchResult` - Résultats avec scores et snippets
- 30+ interfaces pour système complet de gestion de fichiers

### 🔄 Compatibilité DRIVE

Le module DRIVE est **100% rétrocompatible** :

```tsx
// ✅ Ancienne méthode (continue de fonctionner)
import { SimpleDriveView } from '@/components/drive/SimpleDriveView';

// ✅ Nouvelle méthode (recommandée)
import { ModularDriveView, useDrive, DriveAPI } from '@/modules/drive';

// ✅ Hooks spécialisés (nouveau)
import { useDriveActions, useDriveSearch, useDriveStats } from '@/modules/drive';
```

### 🚀 Avantages DRIVE

#### Performance
- **Chargement optimisé** : Requêtes avec jointures pour drives + nœuds + stats
- **Upload chunked** : Fichiers volumineux avec progression incrémentale
- **Cache intelligent** : Hooks avec auto-refresh et gestion d'état optimisée
- **Recherche debounced** : Évite les appels API excessifs

#### Fonctionnalités Avancées
- **Drag & drop complet** : Système de fichiers + déplacement inter-dossiers
- **Recherche full-text** : Avec filtres, scores et historique
- **Statistiques riches** : Usage, répartition types, activité utilisateurs
- **Partage granulaire** : Users, groups, liens publics avec expiration
- **Versioning** : Checksums et versions multiples
- **Vignettes auto** : Génération pour images
- **Navigation breadcrumb** : Fil d'Ariane avec navigation rapide
- **Sélection multiple** : Actions bulk sur fichiers/dossiers

#### Collaboration
- **Journal d'activité** : Toutes les actions trackées avec utilisateur
- **Permissions fines** : Read/Write/Delete/Share/Manage par nœud
- **Intégrations** : Kanban, Messages, Projets via DriveIntegration
- **Sync externe** : Google Drive, Dropbox (structure prête)
- **Notifications** : Système d'alertes pour partages et modifications

#### Sécurité
- **URLs signées** : Téléchargements sécurisés avec expiration
- **Checksums** : Validation intégrité fichiers
- **Soft delete** : Récupération possible des fichiers supprimés
- **Audit trail** : Traçabilité complète des actions

## 📊 État Actuel

| Module | Statut | Services | Hooks | Components | Tests |
|--------|--------|----------|-------|------------|-------|
| **PROJETS** | ✅ Complété | ✅ | ✅ | ✅ | ✅ |
| **KANBAN** | ✅ Complété | ✅ | ✅ | ✅ | ✅ |
| **MESSAGES** | ✅ Complété | ✅ | ✅ | ✅ | ✅ |
| **DRIVE** | ✅ Complété | ✅ | ✅ | ✅ | ✅ |
| PLANNING | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| WIKI | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| VIDEO | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |
| PARAMETRES | 🚧 Planifié | ❌ | ❌ | ❌ | ❌ |

---

> 💡 **Note** : Cette architecture respecte les principes SOLID et facilite la maintenance à long terme. Chaque module peut évoluer indépendamment sans affecter les autres.