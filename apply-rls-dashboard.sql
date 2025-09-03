-- Script pour appliquer dans le Dashboard Supabase SQL Editor
-- Ce script utilise les fonctions Supabase pour gérer les politiques RLS

-- 1. D'abord, vérifier les politiques existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 2. Si des politiques existent déjà avec des noms similaires, les supprimer
-- Note: Vous devrez peut-être les supprimer manuellement via l'interface Supabase

-- 3. Créer les nouvelles politiques via l'interface Supabase Authentication > Policies
-- Ou utiliser ces requêtes si vous avez les permissions :

-- Policy 1: Upload (INSERT)
-- Name: storage_upload_project_members
-- Target roles: authenticated
-- WITH CHECK expression:
/*
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
    AND hra.booking_status = 'accepted'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.client_team_members ctm
    WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
    AND ctm.user_id = auth.uid()
    AND ctm.status = 'active'
  )
)
*/

-- Policy 2: View (SELECT)
-- Name: storage_view_project_members
-- Target roles: authenticated
-- USING expression:
/*
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
    AND hra.booking_status = 'accepted'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.client_team_members ctm
    WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
    AND ctm.user_id = auth.uid()
    AND ctm.status = 'active'
  )
)
*/

-- Policy 3: Update
-- Name: storage_update_project_members
-- Target roles: authenticated
-- USING expression: (même que View)
-- WITH CHECK expression: (même que Upload mais sans team members)

-- Policy 4: Delete
-- Name: storage_delete_project_members  
-- Target roles: authenticated
-- USING expression: (même que Update)

-- 4. Vérifier que les candidats ont bien les accès
SELECT 
    cp.id as candidate_id,
    cp.user_id,
    cp.first_name,
    cp.last_name,
    hra.project_id,
    hra.booking_status,
    p.title as project_title
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
ORDER BY p.title, cp.last_name;

-- 5. Test de vérification du chemin
-- Vérifier que le chemin utilise bien 'projects/' avec un 's'
SELECT 
    name,
    bucket_id,
    created_at
FROM storage.objects
WHERE bucket_id = 'project-files'
AND name LIKE 'project/%'  -- Sans 's' = ancien format
LIMIT 10;

-- Si des fichiers avec l'ancien format existent, les mettre à jour :
-- UPDATE storage.objects 
-- SET name = REPLACE(name, 'project/', 'projects/')
-- WHERE bucket_id = 'project-files' 
-- AND name LIKE 'project/%';