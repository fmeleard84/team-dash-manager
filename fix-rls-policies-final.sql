-- Script FINAL pour corriger les politiques RLS du Drive
-- À exécuter dans le Dashboard Supabase SQL Editor

-- 1. Vérifier l'état actuel des politiques
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 2. Afficher un candidat accepté pour test
SELECT 
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
LIMIT 1;

-- 3. IMPORTANT: Aller dans le Dashboard Supabase
-- Authentication > Policies > storage.objects
-- Et créer ces 4 nouvelles politiques :

/*
===========================================
POLICY 1: INSERT (Upload)
===========================================
Name: allow_project_members_upload
Target roles: authenticated
WITH CHECK:

bucket_id = 'project-files' AND 
(
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = SPLIT_PART(name, '/', 2)
    AND p.owner_id = auth.uid()
  ))
  OR
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.hr_resource_assignments hra
    JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
    AND cp.user_id = auth.uid()
    AND hra.booking_status = 'accepted'
  ))
  OR
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.client_team_members ctm
    WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
    AND ctm.user_id = auth.uid()
    AND ctm.status = 'active'
  ))
)

===========================================
POLICY 2: SELECT (View)
===========================================
Name: allow_project_members_view
Target roles: authenticated
USING:

bucket_id = 'project-files' AND 
(
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = SPLIT_PART(name, '/', 2)
    AND p.owner_id = auth.uid()
  ))
  OR
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.hr_resource_assignments hra
    JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
    AND cp.user_id = auth.uid()
    AND hra.booking_status = 'accepted'
  ))
  OR
  (name LIKE 'projects/%' AND EXISTS (
    SELECT 1 FROM public.client_team_members ctm
    WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
    AND ctm.user_id = auth.uid()
    AND ctm.status = 'active'
  ))
)

===========================================
POLICY 3: UPDATE
===========================================
Name: allow_project_members_update
Target roles: authenticated
USING: (même que View)
WITH CHECK: (même que Upload)

===========================================
POLICY 4: DELETE
===========================================
Name: allow_project_members_delete
Target roles: authenticated
USING: (même que View)
*/

-- 4. Test de vérification après création des politiques
-- Cette requête simule ce que fait la politique RLS
WITH test_user AS (
    SELECT user_id, project_id 
    FROM hr_resource_assignments hra
    JOIN candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.booking_status = 'accepted'
    AND cp.user_id IS NOT NULL
    LIMIT 1
)
SELECT 
    'Test candidat peut uploader' as test,
    tu.user_id,
    tu.project_id,
    'projects/' || tu.project_id || '/test.pdf' as test_path,
    EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id = tu.project_id
        AND cp.user_id = tu.user_id
        AND hra.booking_status = 'accepted'
    ) as should_have_access
FROM test_user tu;

-- 5. Si les politiques ne fonctionnent toujours pas, 
-- essayez cette version simplifiée dans le Dashboard :

/*
POLITIQUE SIMPLIFIÉE POUR TEST:
Name: allow_all_authenticated_upload
Target roles: authenticated
WITH CHECK:
bucket_id = 'project-files' AND name LIKE 'projects/%'

Ceci permettra à tous les utilisateurs authentifiés d'uploader.
Une fois que ça marche, on pourra affiner les restrictions.
*/