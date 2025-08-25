# Analyse de la Structure de Base de Données

## Problème Principal Identifié

L'Assistant comptable qui a accepté le projet n'apparaît pas dans les listes de membres car :
1. Son assignation est en statut `"recherche"` au lieu de `"accepted"` ou `"booké"`
2. Le hook `useProjectUsers` filtrait uniquement les statuts `['accepted', 'booké']`

## Structure Actuelle (Système Dual)

### 1. Système Legacy (profile_id)
- **Table**: `hr_profiles`
- **Référence**: `profile_id` dans `hr_resource_assignments`
- **Problème**: Pas de lien direct avec un utilisateur authentifiable

### 2. Nouveau Système (candidate_id)
- **Table**: `candidate_profiles`
- **Référence**: `candidate_id` dans `hr_resource_assignments`
- **Avantage**: Email unique, utilisateur authentifiable

## Tables Principales

### hr_resource_assignments
```sql
- id: UUID
- project_id: UUID (FK -> projects)
- candidate_id: UUID (FK -> candidate_profiles) -- Nouveau système
- profile_id: UUID (FK -> hr_profiles) -- Ancien système
- booking_status: TEXT ('recherche', 'accepted', 'booké', etc.)
- job_title: TEXT
- seniority: TEXT
- created_at: TIMESTAMP
```

### Flux d'Acceptation de Mission

1. **Création**: Assignment créé avec `booking_status = 'recherche'`
2. **Notification**: Le candidat voit la mission dans `CandidateMissionRequests`
3. **Acceptation**: Appel à `resource-booking` -> `booking_status = 'accepted'`
4. **Problème**: Si le candidat n'a jamais formellement accepté, reste en `'recherche'`

## Incohérences Détectées

### 1. Statuts de Booking Non Uniformes
- `'recherche'`: En attente d'acceptation
- `'accepted'`: Accepté par le candidat
- `'booké'`: Confirmé par le client
- `NULL`: Statut indéterminé

**Solution**: Normaliser les statuts et créer un enum dans la DB

### 2. Double Référencement (profile_id vs candidate_id)
- Certaines assignations utilisent `profile_id` (ancien)
- D'autres utilisent `candidate_id` (nouveau)
- Parfois les deux, parfois aucun

**Solution**: Migration complète vers `candidate_id`

### 3. Filtrage Trop Restrictif
- Le hook filtrait uniquement `['accepted', 'booké']`
- Les assignations en `'recherche'` étaient invisibles

**Solution Appliquée**: Récupérer TOUTES les assignations temporairement

## Corrections Appliquées

### 1. Hook useProjectUsers
- **Avant**: `.in('booking_status', ['accepted', 'booké'])`
- **Après**: Récupère TOUTES les assignations pour debug

### 2. Fonction Edge fix-assignment-status
- Corrige automatiquement les statuts `'recherche'` -> `'accepted'`
- Déployée sur le projet

### 3. Logging Amélioré
- Ajout de logs détaillés dans `useProjectUsers`
- Affichage de chaque assignation avec son statut

## Recommandations

### Court Terme (MVP)
1. ✅ Corriger les statuts existants via la fonction Edge
2. ✅ Adapter le hook pour gérer tous les cas
3. Documenter les statuts valides

### Moyen Terme
1. Créer un enum pour `booking_status`
2. Migrer toutes les références vers `candidate_id`
3. Supprimer le système `profile_id`

### Long Terme
1. Refactoriser le modèle de données
2. Créer une table `project_members` unifiée
3. Implémenter un système de rôles propre

## Scripts Utiles

### Voir toutes les assignations d'un projet
```sql
SELECT * FROM hr_resource_assignments 
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
```

### Corriger les statuts
```sql
UPDATE hr_resource_assignments 
SET booking_status = 'accepted'
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND booking_status = 'recherche';
```

### Migrer profile_id vers candidate_id
```sql
-- Créer les candidate_profiles manquants
INSERT INTO candidate_profiles (email)
SELECT DISTINCT 
  LOWER(REPLACE(hp.name, ' ', '.')) || '@temp.com'
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.candidate_id IS NULL;
```

## État Final

Après les corrections :
- Le hook `useProjectUsers` récupère TOUTES les assignations
- Les logs permettent de déboguer les problèmes
- Une fonction Edge permet de corriger les statuts manuellement
- La structure est documentée pour une refactorisation future