# 🔧 Guide pour Corriger les Politiques RLS Storage dans Supabase

## ⚡ Méthode Rapide : Via SQL Editor

### Étapes :
1. Connectez-vous à votre Dashboard Supabase
2. Menu latéral → **SQL Editor**
3. Cliquez sur **"New query"**
4. Copiez-collez TOUT le script SQL ci-dessous
5. Cliquez sur **"Run"**

### Script SQL Complet :

```sql
-- ========================================
-- CORRECTION DES POLITIQUES RLS STORAGE
-- Accepte 'accepted' ET 'booké'
-- ========================================

-- 1. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "project_members_upload" ON storage.objects;
DROP POLICY IF EXISTS "project_members_view" ON storage.objects;
DROP POLICY IF EXISTS "project_members_update" ON storage.objects;
DROP POLICY IF EXISTS "project_members_delete" ON storage.objects;

-- 2. Créer la politique UPLOAD (INSERT)
CREATE POLICY "project_members_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    -- Clients peuvent uploader
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidats avec 'accepted' OU 'booké' peuvent uploader
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')
    )
  )
);

-- 3. Créer la politique VIEW (SELECT)
CREATE POLICY "project_members_view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    -- Clients peuvent voir
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidats avec 'accepted' OU 'booké' peuvent voir
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')
    )
  )
);

-- 4. Créer la politique UPDATE
CREATE POLICY "project_members_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')
    )
  )
)
WITH CHECK (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')
    )
  )
);

-- 5. Créer la politique DELETE
CREATE POLICY "project_members_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')
    )
  )
);

-- 6. Vérifier que les politiques sont créées
SELECT 
    policyname,
    CASE cmd
        WHEN 'INSERT' THEN '📝 UPLOAD'
        WHEN 'SELECT' THEN '👁️ VIEW'
        WHEN 'UPDATE' THEN '✏️ UPDATE'
        WHEN 'DELETE' THEN '🗑️ DELETE'
    END as action,
    'Accepte accepted ET booké' as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE 'project_members_%'
ORDER BY policyname;
```

---

## 🎨 Méthode Manuelle : Via l'Interface Storage

### Étapes :

1. **Connectez-vous** à votre Dashboard Supabase
2. Menu latéral → **Storage**
3. Cliquez sur l'onglet **Policies**
4. **Supprimez** les 4 politiques existantes `project_members_*`
5. Pour CHAQUE politique ci-dessous, faites :
   - Cliquez sur **"New Policy"**
   - Choisissez **"Create from scratch"**
   - Remplissez les champs comme indiqué

### Politique 1 : UPLOAD (INSERT)

**Name:** `project_members_upload`
**Policy command:** INSERT
**Target roles:** authenticated
**WITH CHECK expression:**
```sql
bucket_id = 'project-files' AND
name LIKE 'projects/%' AND
(
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.hr_resource_assignments hra
    JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status IN ('accepted', 'booké')
  )
)
```

### Politique 2 : VIEW (SELECT)

**Name:** `project_members_view`
**Policy command:** SELECT
**Target roles:** authenticated
**USING expression:**
```sql
bucket_id = 'project-files' AND
name LIKE 'projects/%' AND
(
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.hr_resource_assignments hra
    JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status IN ('accepted', 'booké')
  )
)
```

### Politique 3 : UPDATE

**Name:** `project_members_update`
**Policy command:** UPDATE
**Target roles:** authenticated
**USING expression:** (même que VIEW)
**WITH CHECK expression:** (même que UPLOAD)

### Politique 4 : DELETE

**Name:** `project_members_delete`
**Policy command:** DELETE
**Target roles:** authenticated
**USING expression:** (même que VIEW)

---

## ✅ Vérification

Après avoir appliqué les changements :

1. Demandez au candidat de **se déconnecter et se reconnecter**
2. Testez l'upload d'un fichier depuis le dashboard candidat
3. Le message d'erreur RLS devrait disparaître

## 🔑 Points Clés

- Les politiques acceptent maintenant **'accepted' ET 'booké'**
- Pas besoin de modifier vos données
- Les clients ne sont pas impactés
- Solution permanente