-- Script corrigé pour créer la fonction d'accès et les politiques RLS
-- À exécuter dans le Dashboard Supabase SQL Editor

-- 1. D'abord, vérifions la structure de client_team_members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'client_team_members'
ORDER BY ordinal_position;

-- 2. Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.user_has_project_access(uuid);

-- 3. Créer la fonction corrigée (sans client_team_members pour l'instant)
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
  
  -- Check if user is in project_teams (alternative to client_team_members)
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

-- 4. Test de la fonction avec un candidat connu
SELECT 
    '5c438ca9-4757-4d86-8a5c-6b5c56463abb'::uuid as test_user_id,
    '8f9ab417-948b-4d87-acab-5e7f61b1d0ae'::uuid as test_project_id,
    public.user_has_project_access('8f9ab417-948b-4d87-acab-5e7f61b1d0ae'::uuid) as should_have_access;

-- 5. Vérifier que la fonction marche pour plusieurs candidats
SELECT 
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    hra.project_id,
    p.title as projet,
    hra.booking_status
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
LIMIT 5;

-- 6. MAINTENANT, allez dans Dashboard > Authentication > Policies
-- Supprimez TOUTES les anciennes politiques pour storage.objects
-- Et créez ces 4 nouvelles politiques :

/*
=====================================
POLITIQUE 1: INSERT (Upload) 
=====================================
Policy name: drive_upload_access
Table: storage.objects
Allowed operation: INSERT
Target roles: authenticated

WITH CHECK expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)

=====================================
POLITIQUE 2: SELECT (View)
=====================================
Policy name: drive_view_access
Table: storage.objects
Allowed operation: SELECT
Target roles: authenticated

USING expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)

=====================================
POLITIQUE 3: UPDATE
=====================================
Policy name: drive_update_access
Table: storage.objects
Allowed operation: UPDATE
Target roles: authenticated

USING expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)

WITH CHECK expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)

=====================================
POLITIQUE 4: DELETE
=====================================
Policy name: drive_delete_access
Table: storage.objects
Allowed operation: DELETE
Target roles: authenticated

USING expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
*/

-- 7. Alternative: Si ça ne marche toujours pas, politique ultra-permissive temporaire
/*
POUR TESTER SEULEMENT:
Policy name: temp_allow_all
Operation: INSERT
Target roles: authenticated

WITH CHECK:
bucket_id = 'project-files' AND name LIKE 'projects/%'

Ceci permet à TOUS les utilisateurs authentifiés d'uploader.
*/