-- SCRIPT FINAL POUR CORRIGER L'UPLOAD DES CANDIDATS
-- Exécutez ce script dans le Dashboard SQL Editor de Supabase

-- ========================================
-- ÉTAPE 1: Créer la fonction d'accès
-- ========================================
DROP FUNCTION IF EXISTS public.user_has_project_access(uuid);

CREATE OR REPLACE FUNCTION public.user_has_project_access(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user is project owner
  IF EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id_param 
    AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is an accepted candidate
  IF EXISTS (
    SELECT 1 FROM public.hr_resource_assignments hra
    JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE hra.project_id = project_id_param
    AND cp.user_id = auth.uid()
    AND hra.booking_status = 'accepted'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is in project_teams
  IF EXISTS (
    SELECT 1 FROM public.project_teams pt
    WHERE pt.project_id = project_id_param
    AND pt.member_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ========================================
-- ÉTAPE 2: Allez dans Dashboard > Authentication > Policies
-- ========================================
-- 1. Trouvez la table "storage.objects"
-- 2. SUPPRIMEZ toutes les politiques existantes
-- 3. Créez ces 4 nouvelles politiques :

-- ========================================
-- POLITIQUE 1: INSERT (Upload)
-- ========================================
-- Name: storage_allow_upload
-- Operation: INSERT
-- Target roles: authenticated
-- WITH CHECK:
/*
bucket_id = 'project-files' AND name LIKE 'projects/%' AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/

-- ========================================
-- POLITIQUE 2: SELECT (View)
-- ========================================
-- Name: storage_allow_view
-- Operation: SELECT
-- Target roles: authenticated
-- USING:
/*
bucket_id = 'project-files' AND name LIKE 'projects/%' AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/

-- ========================================
-- POLITIQUE 3: UPDATE
-- ========================================
-- Name: storage_allow_update
-- Operation: UPDATE
-- Target roles: authenticated
-- USING:
/*
bucket_id = 'project-files' AND name LIKE 'projects/%' AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/
-- WITH CHECK:
/*
bucket_id = 'project-files' AND name LIKE 'projects/%' AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/

-- ========================================
-- POLITIQUE 4: DELETE
-- ========================================
-- Name: storage_allow_delete
-- Operation: DELETE
-- Target roles: authenticated
-- USING:
/*
bucket_id = 'project-files' AND name LIKE 'projects/%' AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/

-- ========================================
-- ÉTAPE 3: Vérifier que tout fonctionne
-- ========================================
-- Test avec le candidat connu
SELECT 
    'Test pour candidat e64bc15d-e510-4e56-9502-a34be987218c' as description,
    public.user_has_project_access('d7dff6ec-5019-40ab-a00f-8bac8806eca7'::uuid) as should_return_true;

-- Vérifier tous les candidats acceptés
SELECT 
    cp.first_name || ' ' || cp.last_name as candidat,
    p.title as projet,
    'projects/' || hra.project_id || '/test.pdf' as exemple_chemin,
    public.user_has_project_access(hra.project_id) as a_acces_fonction
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL;

-- Si tout est OK, vous devriez voir "true" dans la colonne a_acces_fonction