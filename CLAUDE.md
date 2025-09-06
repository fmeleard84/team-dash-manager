# Documentation Technique Claude - Team Dash Manager

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

## 📚 Pour Plus d'Infos
Consulter `/llm` dans l'application pour la documentation complète et éditable.