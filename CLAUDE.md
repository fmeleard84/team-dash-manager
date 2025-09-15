# Documentation Technique Claude - Team Dash Manager

## 🎨 CHARTE GRAPHIQUE & DESIGN SYSTEM (14/09/2025)

### 📐 Principes de base
- **Framework CSS** : Tailwind CSS exclusivement (pas de CSS inline ni de couleurs hex en dur)
- **Mode sombre** : Support natif obligatoire avec préfixe `dark:`
- **Cohérence** : Tous les styles dérivent de la configuration Tailwind
- **Effet néon moderne** : Utilisation de shadows, gradients et animations pour un look cyberpunk élégant

### 🎨 Palette de couleurs

#### Couleurs principales
```js
primary: {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',  // DEFAULT - Violet principal
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764'
}

secondary: {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#ec4899',  // DEFAULT - Rose/Pink
  600: '#db2777',
  700: '#be185d',
  800: '#9f1239',
  900: '#831843',
  950: '#500724'
}

accent: {
  cyan: '#06b6d4',    // Cyan pour accents
  blue: '#3b82f6',    // Bleu électrique
  indigo: '#6366f1',  // Indigo profond
}

neutral: {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#0a0a0b'
}
```

### 🌟 Effets Néon & Glassmorphism

#### Classes utilitaires néon
```css
/* Shadows néon */
.neon-purple: shadow-[0_0_15px_rgba(168,85,247,0.5)]
.neon-pink: shadow-[0_0_15px_rgba(236,72,153,0.5)]
.neon-cyan: shadow-[0_0_15px_rgba(6,182,212,0.5)]

/* Effets de texte néon */
.text-neon: text-transparent bg-clip-text bg-gradient-to-r

/* Glassmorphism */
.glass: backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10

/* Animations */
.animate-pulse-slow: animation-duration: 3s
.animate-glow: animation avec keyframes pour effet de brillance
```

### 📝 Typographie

#### Hiérarchie des titres
```jsx
// H1 - Titre principal de page
<h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">

// H2 - Sections principales
<h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-white">

// H3 - Sous-sections
<h3 className="text-xl md:text-2xl font-medium text-neutral-800 dark:text-neutral-100">

// Corps de texte
<p className="text-base text-neutral-600 dark:text-neutral-400">

// Texte secondaire/meta
<span className="text-sm text-neutral-500 dark:text-neutral-500">
```

### 🔘 Composants UI

#### Boutons
```jsx
// Primaire - Action principale avec effet néon
<Button className="
  bg-gradient-to-r from-primary-500 to-secondary-500
  text-white font-medium
  px-6 py-3 rounded-xl
  shadow-lg shadow-primary-500/25
  hover:shadow-xl hover:shadow-primary-500/40
  hover:scale-105 active:scale-95
  transition-all duration-200
">

// Secondaire - Actions secondaires
<Button className="
  bg-neutral-100 dark:bg-neutral-800
  text-neutral-900 dark:text-white
  border border-neutral-200 dark:border-neutral-700
  px-6 py-3 rounded-xl
  hover:bg-neutral-200 dark:hover:bg-neutral-700
  transition-all duration-200
">

// Ghost - Actions tertiaires
<Button className="
  text-neutral-600 dark:text-neutral-400
  hover:text-primary-500 dark:hover:text-primary-400
  hover:bg-neutral-100 dark:hover:bg-neutral-800
  px-4 py-2 rounded-lg
  transition-all duration-200
">

// Néon - Actions spéciales
<Button className="
  relative
  bg-gradient-to-r from-primary-600 to-secondary-600
  text-white font-bold
  px-8 py-4 rounded-2xl
  shadow-[0_0_20px_rgba(168,85,247,0.5)]
  hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]
  before:absolute before:inset-0
  before:bg-gradient-to-r before:from-primary-400 before:to-secondary-400
  before:blur-xl before:opacity-50
  hover:before:opacity-75
  transition-all duration-300
">
```

#### Cards
```jsx
// Card standard avec glassmorphism
<Card className="
  backdrop-blur-xl
  bg-white/80 dark:bg-neutral-900/80
  border border-neutral-200/50 dark:border-neutral-700/50
  rounded-2xl
  shadow-xl
  p-6
">

// Card néon
<Card className="
  relative
  bg-gradient-to-br from-neutral-900 to-neutral-950
  border border-primary-500/20
  rounded-2xl
  p-6
  shadow-[0_0_30px_rgba(168,85,247,0.1)]
  hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]
  transition-all duration-300
">

// Card avec bordure gradient
<div className="p-[1px] bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl">
  <Card className="
    bg-white dark:bg-neutral-900
    rounded-2xl
    p-6
  ">
```

#### Badges & Tags
```jsx
// Badge status
<Badge className="
  bg-gradient-to-r from-green-500/10 to-emerald-500/10
  text-green-600 dark:text-green-400
  border border-green-500/20
  px-3 py-1 rounded-full
  font-medium text-xs
">

// Badge néon
<Badge className="
  bg-primary-500/10
  text-primary-400
  border border-primary-500/30
  shadow-[0_0_10px_rgba(168,85,247,0.3)]
  px-3 py-1 rounded-full
">
```

#### Inputs & Forms
```jsx
// Input standard
<Input className="
  bg-white dark:bg-neutral-900
  border border-neutral-200 dark:border-neutral-700
  rounded-xl
  px-4 py-3
  focus:border-primary-500 dark:focus:border-primary-400
  focus:ring-2 focus:ring-primary-500/20
  transition-all duration-200
  placeholder:text-neutral-400 dark:placeholder:text-neutral-600
">

// Input avec effet néon au focus
<Input className="
  bg-neutral-50 dark:bg-neutral-900/50
  border border-neutral-200 dark:border-neutral-700
  rounded-xl
  px-4 py-3
  focus:border-primary-500
  focus:shadow-[0_0_10px_rgba(168,85,247,0.3)]
  focus:ring-0
  transition-all duration-200
">
```

### 🎭 États et interactions

#### Hover States
- Augmentation subtile de l'ombre : `hover:shadow-xl`
- Scale léger : `hover:scale-105`
- Changement de luminosité : `hover:brightness-110`
- Effet glow néon : `hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]`

#### Active States
- Scale réduit : `active:scale-95`
- Ombre réduite : `active:shadow-sm`

#### Disabled States
```jsx
disabled:opacity-50
disabled:cursor-not-allowed
disabled:hover:scale-100
```

### 📱 Responsive Design

#### Breakpoints standards
- Mobile: default
- Tablet: `md:` (768px)
- Desktop: `lg:` (1024px)
- Large: `xl:` (1280px)

#### Espacements
- Toujours multiples de 4 : `p-4`, `m-8`, `gap-6`
- Mobile first : commencer par mobile puis ajouter `md:`, `lg:`

### ✨ Animations & Transitions

#### Transitions par défaut
```jsx
transition-all duration-200 ease-in-out
```

#### Animations personnalisées
```jsx
// Pulse néon
@keyframes neon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Glow effect
@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(168,85,247,0.5); }
  50% { box-shadow: 0 0 20px rgba(168,85,247,0.8); }
  100% { box-shadow: 0 0 5px rgba(168,85,247,0.5); }
}
```

### ✅ Checklist avant commit

- [ ] Aucune couleur hex hardcodée
- [ ] Compatible dark/light mode
- [ ] Effets hover/active/disabled implémentés
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Animations fluides (60fps)
- [ ] Accessibilité (contraste, focus visible)
- [ ] Performance (pas d'animations sur mobile si lourdes)
- [ ] Cohérence avec le design system

### 🚀 Exemples de mise en œuvre

#### Header avec effet néon
```jsx
<header className="
  fixed top-0 w-full z-50
  backdrop-blur-xl
  bg-white/80 dark:bg-neutral-900/80
  border-b border-neutral-200/50 dark:border-neutral-700/50
  shadow-lg
">
```

#### Section hero avec gradient
```jsx
<section className="
  relative
  bg-gradient-to-br from-neutral-900 via-primary-900/20 to-neutral-900
  overflow-hidden
">
  {/* Effet de particules/grille en background */}
  <div className="
    absolute inset-0
    bg-[url('/grid.svg')] opacity-20
  "/>
</section>
```

### 🎯 Règles d'or

1. **Minimalisme** : Less is more - éviter la surcharge visuelle
2. **Cohérence** : Utiliser les mêmes patterns partout
3. **Performance** : Animations légères, pas de blur excessif sur mobile
4. **Accessibilité** : Contraste suffisant, focus states clairs
5. **Modernité** : Effets subtils mais impactants

> 💡 **Note** : Cette charte est LA référence pour tout développement frontend. Chaque composant doit respecter ces guidelines pour maintenir une identité visuelle forte et cohérente.

---

## 📋 Accès Documentation LLM
La documentation complète est disponible et éditable sur : `/llm` (admin uniquement)

## 🎯 SYSTÈME DE CRÉATION AUTOMATIQUE DES PROFILS (06/09/2025)

### Configuration Webhook + Edge Function
Le système utilise maintenant un **webhook Supabase** qui déclenche une **Edge Function** pour créer automatiquement les profils lors de l'inscription.

#### Architecture
1. **Webhook** : `handle_new_user_simple` sur `auth.users` (INSERT)
2. **Edge Function** : `handle-new-user-simple` 
3. **Création automatique** : `profiles` + `candidate_profiles` ou `client_profiles`

#### Configuration du Webhook (Dashboard Supabase)
1. Aller dans Database → Webhooks
2. Créer un webhook avec :
   - **Name** : `handle_new_user_simple`
   - **Table** : `auth.users`
   - **Events** : INSERT uniquement
   - **Type** : Supabase Edge Functions
   - **Function** : `handle-new-user-simple`

#### Avantages
- ✅ Plus d'erreur 406 lors de la première connexion
- ✅ Onboarding fonctionnel immédiatement
- ✅ Pas de trigger sur `auth.users` (problèmes de permissions)
- ✅ Solution moderne et maintenable

## 🔄 ARCHITECTURE IDS UNIFIÉS (05/09/2025)

### Structure Simplifiée
```
auth.users.id = candidate_profiles.id = client_profiles.id
```
- **Un seul ID universel** : auth.uid() est utilisé partout
- **Performances optimales** : Jointures directes sur UUID
- **RLS simplifiées** : Plus besoin de fonctions pont

### Migration Appliquée
- `candidate_profiles.id` = auth.uid()
- `client_profiles.id` = auth.uid()
- Toutes les FK mises à jour
- Anciennes colonnes conservées dans `old_id` (temporaire)

## 🎯 Statuts Système

### PROJETS (table: projects)
```typescript
status: 'pause' | 'attente-team' | 'play' | 'completed'
```
- **pause**: Projet créé, équipe incomplète ou en attente kickoff
- **attente-team**: Tous les candidats n'ont pas encore accepté
- **play**: Projet actif (outils collaboratifs activés)
- **completed**: Projet terminé

### CANDIDATS (table: candidate_profiles)
```typescript
// Disponibilité
status: 'qualification' | 'disponible' | 'en_pause' | 'indisponible'

// État de qualification
qualification_status: 'pending' | 'stand_by' | 'qualified' | 'rejected'
```

**Important**: Un candidat avec `status = 'qualification'` NE PEUT PAS recevoir de projets

### BOOKING (table: hr_resource_assignments)
```typescript
booking_status: 'draft' | 'recherche' | 'accepted' | 'declined'
```
- **draft**: Ressource définie mais pas recherchée
- **recherche**: Recherche active de candidat
- **accepted**: Candidat a accepté la mission
- **declined**: Candidat a refusé

## 🔄 Flux Métier Principal

### 1. Création Projet
1. Client crée projet → `status: 'pause'`
2. Définit ressources dans ReactFlow
3. Lance recherche → `booking_status: 'recherche'`

### 2. Matching Candidats
- Seuls candidats avec `status != 'qualification'` reçoivent notifications
- Matching sur: `profile_id`, `seniority`, compétences

### 3. Acceptation
- Candidat accepte → `booking_status: 'accepted'`
- Tous acceptent → projet `status: 'attente-team'`

### 4. Démarrage (Kickoff)
- Client démarre → `project-orchestrator` crée:
  - Planning partagé
  - Kanban
  - Drive
  - Messages
- Projet → `status: 'play'`
- **Seuls projets 'play' ont accès aux outils collaboratifs**

## ⚠️ Points d'Attention

### Filtres Critiques
```typescript
// Pour les candidats - projets actifs uniquement
.filter(p => p.status === 'play')

// Pour le matching - candidats qualifiés uniquement  
.filter(c => c.status !== 'qualification')

// Pour le démarrage - ressources acceptées
.filter(r => r.booking_status === 'accepted')
```

### Hooks Importants
- `useCandidateProjectsOptimized()`: Retourne UNIQUEMENT projets avec `status='play'`
- `useProjectOrchestrator()`: Gère le démarrage de projet et création des outils
- `useCandidateIdentity()`: Récupère l'identité complète du candidat

### Edge Functions Critiques
- `project-orchestrator`: Configure projet au démarrage
- `resource-booking`: Gère acceptation/refus candidats
- `project-kickoff`: Synchronise planning équipe

## 🐛 Bugs Corrigés

### Session 2 (03/09/2025)

1. ✅ **Matching candidats incomplet**: 
   - **Problème**: CandidateDashboard ne vérifiait pas langues/expertises
   - **Solution**: Ajout du filtrage complet avec 5 critères obligatoires
   - **Fichier**: src/pages/CandidateDashboard.tsx

2. ✅ **Popup projets acceptés (404)**:
   - **Problème**: CTA "Accéder au projet" générait une 404
   - **Solution**: Toujours ouvrir le popup fullscreen
   - **Fichier**: src/components/candidate/CandidateProjectsSection.tsx

3. ✅ **Suppression projet (contrainte SQL)**:
   - **Problème**: status='cancelled' violait projects_status_check
   - **Solution**: Edge function fix-project-delete utilise status='completed'
   - **Fichier**: src/components/DeleteProjectDialog.tsx

### Session 3 (04/09/2025)

4. ✅ **Fichiers attachés aux projets**:
   - **Problème**: Incohérence de chemins (`project/` vs `projects/`)
   - **Solution**: Unifié sur `projects/${projectId}/` partout
   - **Fichiers**: CreateProjectModal, EditProjectModal, ProjectCard
   - **Affichage**: Ajouté icône Paperclip avec nombre de fichiers

5. ✅ **Barre progression équipe non réactive**:
   - **Problème**: `bookingProgress` calculé une seule fois
   - **Solution**: Utilisation de `useMemo` avec dépendance sur `resourceAssignments`
   - **Fichier**: src/components/ProjectCard.tsx

6. ✅ **Métiers validés peu visibles**:
   - **Solution**: Fond vert (`bg-green-100`) et texte vert (`text-green-700`) avec bordure
   - **Fichier**: src/components/ProjectCard.tsx

7. ✅ **Navigation projet côté client**:
   - **Ajout**: Option "Voir les détails" dans dropdown avec icône Eye
   - **Ajout**: Icône Users pour voir détail équipe
   - **Fichier**: src/components/ProjectCard.tsx

8. ✅ **Fichiers non visibles candidats**:
   - **Solution**: Récupération et affichage dans modal avec téléchargement
   - **Fichier**: src/components/candidate/CandidateProjectsSection.tsx

9. ✅ **Constitution équipe manquante**:
   - **Ajout**: Section complète avec postes, séniorités, langues, expertises
   - **Fichier**: src/components/candidate/CandidateProjectsSection.tsx

10. ✅ **Métier "Non défini" dans cards**:
    - **Problème**: `hr_profiles.name` au lieu de `hr_profiles.label`
    - **Solution**: Mapping correct dans enrichissement
    - **Fichier**: src/pages/CandidateDashboard.tsx

11. ✅ **Date affichée incorrecte**:
    - **Problème**: `formatDistanceToNow` pour dates futures
    - **Solution**: Format date classique avec `toLocaleDateString`
    - **Fichier**: src/components/candidate/CandidateProjectsSection.tsx

### Session 4 (05/09/2025)

12. ✅ **Système Drive modernisé**:
    - **Implémentation**: SimpleDriveView avec drag & drop complet
    - **Fonctionnalités**: 
      - Drag & drop depuis Finder/système de fichiers
      - Drag & drop entre dossiers du Drive (avec gestion des conflits)
      - Fil d'Ariane (breadcrumb) pour navigation
      - Upload avec progression incrémentale
      - Vignettes pour images
      - Renommer/supprimer dossiers
      - Intégration Messagerie et Kanban
      - Sélecteur de projet pour Client et Candidat
      - Feedback visuel amélioré (zones de drop, animations)
      - Gestion des fichiers dupliqués avec timestamp
    - **Fichiers**: 
      - src/components/drive/SimpleDriveView.tsx
      - src/pages/ClientDashboard.tsx
      - src/pages/CandidateDashboard.tsx

## ✅ Corrections Session 5 (06/09/2025)

13. **Contrainte statut projet corrigée**:
    - **Problème**: Contrainte n'acceptait pas 'attente-team'
    - **Solution**: Migration SQL + Edge function fix-project-status-constraint
    - **Statuts valides**: 'pause', 'attente-team', 'play', 'completed'
    - **Fichiers**: 
      - supabase/migrations/20250906_fix_project_status_constraint.sql
      - supabase/functions/fix-project-status-constraint/index.ts

14. **Nettoyage fichiers debug**:
    - **Action**: 70+ fichiers de test/debug archivés dans _archive_debug/
    - **Ajout**: _archive_debug/ dans .gitignore

15. ✅ **Système de création automatique des profils restauré**:
    - **Problème**: Après migration ID universel, les profils n'étaient plus créés automatiquement (erreur 406)
    - **Cause**: Trigger sur `auth.users` supprimé et impossible à recréer (permissions)
    - **Solution**: Webhook + Edge Function `handle-new-user-simple`
    - **Résultat**: Création automatique de `profiles` et `candidate_profiles` à l'inscription
    - **Fichiers**:
      - supabase/functions/handle-new-user-simple/index.ts
      - src/components/candidate/CandidateSettings.tsx (fix téléphone)

## 📝 Conventions

### Nommage Composants
- Préfixer avec `Shared` pour composants partagés
- Préfixer avec `Candidate` pour composants candidat
- Préfixer avec `Client` pour composants client

### Real-time
- Utiliser `useRealtimeProjectsFixed` pour les mises à jour
- Toujours filtrer côté serveur (RLS)

### Sécurité
- **JAMAIS** de filtrage uniquement côté client
- Toujours vérifier `owner_id` pour les clients
- Toujours vérifier `candidate_id` pour les candidats

## 🔑 Clés API Supabase (IMPORTANTES)

**⚠️ TOUJOURS utiliser ces clés officielles (depuis src/integrations/supabase/client.ts) :**

```javascript
// URL Supabase
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";

// Clé ANON (publique - pour le client/frontend)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

// Clé SERVICE ROLE (privée - NE PAS STOCKER dans le code client)
// ⚠️ La clé service_role doit être gardée secrète et utilisée uniquement côté serveur
// Elle se trouve dans les variables d'environnement Supabase, pas dans le code source
```

**IMPORTANT : Ne jamais exposer la clé SERVICE_ROLE dans le code client !**

## 🚀 Commandes Utiles

```bash
# Démarrer le serveur
npm run dev

# Redémarrer si port 8081 bloqué
pkill -f vite && npm run dev

# Déployer une fonction Supabase
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
SUPABASE_DB_PASSWORD="R@ymonde7510_2a" \
npx supabase functions deploy [function-name] --project-ref egdelmcijszuapcpglsy

# Voir les logs d'une fonction
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
npx supabase functions logs [function-name] --project-ref egdelmcijszuapcpglsy --limit 5

# Edge Functions déployées
- fix-project-delete       # Suppression projet sans violation contrainte
- resource-booking         # Acceptation/refus missions candidats
- project-orchestrator     # Configuration initiale projets
- project-kickoff         # Création événements kickoff
- handle-new-user-simple   # Création automatique des profils à l'inscription (06/09/2025)
```

## 📊 Structure Base de Données - Tables Importantes (15/09/2025)

### Table: hr_resource_assignments
Structure pour l'assignation des ressources aux projets :
```sql
- id: UUID PRIMARY KEY
- project_id: UUID (référence projects)
- profile_id: UUID (référence hr_profiles) -- Le profil métier
- candidate_id: UUID (référence candidate_profiles) -- Peut être null
- booking_status: 'draft' | 'recherche' | 'accepted' | 'declined'
- seniority: 'junior' | 'confirmé' | 'senior' | 'expert'
- languages: TEXT[]
- expertises: TEXT[]
```

### Table: hr_profiles
Contient les métiers disponibles :
```sql
- id: UUID PRIMARY KEY
- name: TEXT -- NOM DU MÉTIER (ex: "Chef de projet", "Développeur Full-Stack")
- category_id: UUID (référence hr_categories)
- base_price: DECIMAL
```
**⚠️ IMPORTANT**: Le nom du métier est dans la colonne `name`, PAS `label` !

### Table: hr_categories
Catégories de métiers :
```sql
- id: UUID PRIMARY KEY
- name: TEXT -- Nom de la catégorie (ex: "Marketing", "Développement", "Comptabilité")
```

### Récupération des membres d'équipe
Pour récupérer correctement les membres d'une équipe projet :
1. Requête sur `hr_resource_assignments` avec `project_id`
2. Joindre `hr_profiles` via `profile_id` pour obtenir le métier (`name`)
3. Joindre `candidate_profiles` via `candidate_id` pour les infos candidat
4. Filtrer par `booking_status = 'accepted'` pour les membres confirmés

## 🎨 Composants Universels de Design

### Sélecteurs Universels
1. **ProjectSelectorNeon** (`/src/components/ui/project-selector-neon.tsx`)
   - Sélecteur de projet avec indicateur de statut coloré
   - Titre limité à 15 caractères
   - Support Material Design dark/light

2. **UserSelectNeon** (`/src/components/ui/user-select-neon.tsx`)
   - Sélecteur d'équipe/utilisateur universel
   - Avatars avec initiales et dégradés
   - Affichage du métier depuis `hr_profiles.name`

3. **UserAvatarNeon** (`/src/components/ui/user-avatar-neon.tsx`)
   - Avatars avec support complet dark/light
   - Initiales avec fond dégradé
   - Indicateurs de statut

## 📚 Pour Plus d'Infos
Consulter `/llm` dans l'application pour la documentation complète et éditable.