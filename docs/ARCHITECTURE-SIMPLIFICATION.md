# Simplification de l'Architecture

## Le Vrai Problème

La complexité actuelle n'est **PAS liée au métier** mais à un **développement incohérent**.

### Processus Métier (Simple)
1. **Création de projet** → Définition des besoins (ressources virtuelles)
2. **Matching** → Proposition aux candidats ayant les compétences
3. **Acceptation** → Le candidat accepte, son ID est lié au projet
4. **Listing** → On liste simplement les IDs liés au projet

C'est tout. Pas de complexité métier.

## Complexité Technique (À Éliminer)

### Pourquoi cette complexité existe ?

#### 1. Évolution historique mal gérée
- **V1**: Système avec `hr_profiles` (ressources virtuelles)
- **V2**: Migration vers `candidate_profiles` (vrais utilisateurs)
- **Problème**: Les deux systèmes coexistent au lieu d'avoir migré proprement

#### 2. Tables redondantes
```
hr_resource_assignments
├── profile_id (ancien) → hr_profiles
└── candidate_id (nouveau) → candidate_profiles
```
Pourquoi deux champs ? Un seul suffit.

#### 3. Logique dupliquée
Le hook doit gérer deux cas au lieu d'un seul :
- Si `candidate_id` → chercher dans `candidate_profiles`
- Si `profile_id` → chercher dans `hr_profiles`

## Solution Proposée (Simple)

### Court terme (Appliqué)
✅ Hook simplifié qui gère les deux cas mais avec une logique claire
✅ Affichage uniforme : "Prénom - Métier"

### Moyen terme (À faire)
1. **Migration complète** vers `candidate_id` uniquement
2. **Suppression** de `profile_id` 
3. **Une seule source de vérité** : `candidate_profiles`

### Architecture cible
```sql
-- Simple et clair
hr_resource_assignments
├── id
├── project_id
├── candidate_id  -- SEULE référence
├── booking_status
└── job_title
```

## Code Simplifié

```typescript
// Avant (complexe)
if (assignment.candidate_id) {
  // Logique candidate
} else if (assignment.profile_id) {
  // Logique hr_profile
}

// Après (simple)
const user = await getUserFromAssignment(assignment);
users.push(user);
```

## Conclusion

La complexité vient d'une **dette technique**, pas du métier. Le processus métier est simple :
- Des projets ont des membres
- On liste ces membres
- C'est tout

La solution : **nettoyer la dette technique** en unifiant sur un seul système.