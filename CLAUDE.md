# Documentation Technique Claude - Team Dash Manager

## 📋 Accès Documentation LLM
La documentation complète est disponible et éditable sur : `/llm` (admin uniquement)

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

## 🐛 Bugs Connus / À Corriger

1. **Incohérence booking_status**: 
   - `project-orchestrator` cherche `'accepted'`
   - `resource-booking` met `'booké'`
   - **Solution**: Uniformiser sur `'accepted'`

2. **Filtre candidat disponible**:
   - `project-orchestrator` filtre sur `status = 'disponible'`
   - Candidat qui accepte peut être `'en_pause'`
   - **Solution**: Retirer ce filtre

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

## 🚀 Commandes Utiles

```bash
# Démarrer le serveur
npm run dev

# Déployer une fonction Supabase
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
SUPABASE_DB_PASSWORD="R@ymonde7510_2a" \
npx supabase functions deploy [function-name]

# Voir les logs d'une fonction
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
npx supabase functions logs [function-name] --project-ref egdelmcijszuapcpglsy --limit 5
```

## 📚 Pour Plus d'Infos
Consulter `/llm` dans l'application pour la documentation complète et éditable.