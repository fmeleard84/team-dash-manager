# ✅ SYSTÈME D'INSCRIPTION CORRIGÉ

## Problèmes identifiés et résolus

### 1. **Conflits de triggers**
- **Problème** : Plusieurs triggers essayaient de créer des profils candidats en même temps
  - `on_profile_created` sur la table `profiles`
  - `on_profile_created_candidate` sur la table `profiles`
  - `on_auth_user_created` sur `auth.users`
- **Solution** : Un seul trigger `on_auth_user_created` sur `auth.users` gère tout

### 2. **Structure de table incohérente**
- **Problème** : La table `candidate_profiles` avait des colonnes inexistantes référencées
- **Solution** : 
  - Ajout de la colonne `user_id` pour lier avec `auth.users`
  - Suppression des références à `expertise` (colonne qui n'existe pas)
  - Initialisation correcte de `onboarding_step` à 0

### 3. **Stockage du téléphone**
- **Problème** : Le téléphone n'était pas stocké correctement
- **Solution** : Le trigger récupère maintenant `phone` depuis `raw_user_meta_data` et le stocke dans les deux tables

### 4. **Hook frontend problématique**
- **Problème** : `useCandidateOnboarding` essayait de créer des profils candidats
- **Solution** : Le hook utilise maintenant `user_id` et ne crée plus de profils (le trigger s'en charge)

## Flux d'inscription unifié

### Pour un CLIENT :
1. Utilisateur s'inscrit avec `role: 'client'`
2. Trigger `on_auth_user_created` crée :
   - Une entrée dans `profiles` avec `role = 'client'`
   - Stocke `company_name` et `phone`

### Pour un CANDIDAT :
1. Utilisateur s'inscrit avec `role: 'candidate'`
2. Trigger `on_auth_user_created` crée :
   - Une entrée dans `profiles` avec `role = 'candidate'`
   - Une entrée dans `candidate_profiles` avec :
     - `user_id` = ID de l'utilisateur auth
     - `onboarding_step = 0`
     - `qualification_status = 'pending'`
     - `phone` stocké correctement

## Onboarding des candidats

- L'onboarding est initialisé avec `onboarding_step = 0`
- Le hook `useCandidateOnboarding` :
  - Récupère le profil via `user_id`
  - Met à jour `onboarding_step` en base de données
  - Gère la qualification et les compétences

## Tests effectués

✅ Création d'un utilisateur client : OK
✅ Création d'un utilisateur candidat : OK
✅ Stockage du téléphone : OK
✅ Initialisation de l'onboarding : OK

## Fichiers modifiés

### Backend (SQL) :
- Trigger `handle_new_user` corrigé
- Politiques RLS mises à jour
- Triggers redondants supprimés

### Frontend :
- `/src/hooks/useCandidateOnboarding.ts` - Utilise maintenant `user_id`

## Commandes utiles

Pour vérifier l'état du système :
```bash
# Vérifier les triggers
node supabase-helper.js sql "SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = 'auth.users'::regclass;"

# Vérifier un profil candidat
node supabase-helper.js sql "SELECT * FROM candidate_profiles WHERE user_id = 'USER_ID';"
```

---

**Le système d'inscription est maintenant unifié et fonctionnel pour les deux types d'utilisateurs !**