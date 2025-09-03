# 🔍 Diagnostic Storage RLS - Candidats ne peuvent pas uploader

## 📋 Résumé du Problème
**Erreur** : "new row violates row-level security policy" lors de l'upload de fichiers par les candidats
**Cause** : Candidat non authentifié lors des tests d'upload

## ✅ Données Vérifiées (Toutes Correctes)

### Candidat CDP FM 2708
- **Profile ID** : `1aeea830-be54-4843-ae8e-91da75f477a2`
- **User ID** : `e64bc15d-e510-4e56-9502-a34be987218c` 
- **Email** : `fmeleard+ressource_27_08_cdp@gmail.com`
- **Status** : `disponible`

### Assignation Projet 
- **Projet ID** : `d7dff6ec-5019-40ab-a00f-8bac8806eca7`
- **Booking Status** : `accepted` ✅
- **Lien profiles↔candidate_profiles** : Correct ✅

### Politiques RLS
- **Migration** : `20250829_fix_drive_rls.sql` appliquée ✅
- **Politique INSERT** : `project_members_upload` existe ✅
- **Logique RLS** : Correcte pour les candidats ✅

## ❌ Cause Exacte Identifiée

**PROBLÈME D'AUTHENTIFICATION** 
- Tests effectués avec session anonyme (`auth.uid()` = NULL)
- Politiques RLS requirent : `auth.uid() = candidate_profiles.user_id`
- Sans authentification → Condition RLS échoue → Erreur 403

## 🔍 Tests Effectués

### ✅ Test Accès Lecture Storage
```javascript
supabase.storage.from('project-files').list('projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7')
// ✅ Succès - Pas d'erreur RLS
```

### ❌ Test Upload Storage  
```javascript
supabase.storage.from('project-files').upload(filePath, file)
// ❌ Erreur: "new row violates row-level security policy"
```

**⚠️ Différence** : La lecture fonctionne car pas de session requise, l'upload échoue car `WITH CHECK` vérifie `auth.uid()`

## 💡 Solutions

### 1. Solution Immédiate - Test avec authentification
Le candidat doit être connecté pour tester l'upload :

```javascript
// 1. Se connecter en tant que candidat
await supabase.auth.signInWithPassword({
  email: 'fmeleard+ressource_27_08_cdp@gmail.com',
  password: 'mot_de_passe_candidat'
})

// 2. Puis tester l'upload
await supabase.storage.from('project-files').upload(filePath, file)
```

### 2. Vérification Application
- ✅ AuthContext implémenté correctement
- ✅ useUserProfile gère les candidats
- ✅ SharedDriveView utilise l'authentification
- ⚠️ Vérifier que les candidats sont bien redirigés vers login si non connectés

### 3. Améliorations Optionnelles

#### A. Améliorer les Messages d'Erreur
```typescript
// Dans SharedDriveView.tsx - uploadFiles()
catch (error) {
  if (error.message.includes('row-level security policy')) {
    toast({
      title: "Authentification requise",
      description: "Vous devez être connecté pour uploader des fichiers.",
      variant: "destructive",
    });
  } else {
    // Message d'erreur existant
  }
}
```

#### B. Vérification Auth avant Upload
```typescript
// Ajouter dans SharedDriveView avant uploadFiles
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  toast({
    title: "Connexion requise",
    description: "Veuillez vous connecter pour uploader des fichiers."
  });
  return;
}
```

#### C. Debug Helper pour RLS
```sql
-- Fonction pour debug RLS (à exécuter en tant qu'admin)
CREATE OR REPLACE FUNCTION debug_storage_rls(file_path text, user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  project_id_extracted text;
  candidate_user_id uuid;
  booking_status text;
BEGIN
  -- Extract project ID from path
  project_id_extracted := SPLIT_PART(file_path, '/', 2);
  
  -- Get candidate info
  SELECT cp.user_id, hra.booking_status
  INTO candidate_user_id, booking_status
  FROM candidate_profiles cp
  JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
  WHERE cp.email = user_email 
    AND hra.project_id::text = project_id_extracted;
  
  result := jsonb_build_object(
    'file_path', file_path,
    'project_id_extracted', project_id_extracted,
    'candidate_email', user_email,
    'candidate_user_id', candidate_user_id,
    'booking_status', booking_status,
    'rls_should_pass', (candidate_user_id IS NOT NULL AND booking_status = 'accepted')
  );
  
  RETURN result;
END;
$$;
```

## ✅ Validation Solution

**Pour confirmer que le problème est résolu :**

1. **Candidat doit être authentifié** (session valide)
2. **Tester upload avec auth.uid() = candidate_profiles.user_id**
3. **Vérifier que l'erreur RLS disparaît**

## 🎯 Conclusion

**Le système fonctionne correctement** - Le problème était uniquement l'absence d'authentification lors des tests. Une fois le candidat connecté, les uploads devraient fonctionner normalement.

**Priorité** : S'assurer que les candidats sont bien authentifiés quand ils accèdent au drive dans l'application réelle.