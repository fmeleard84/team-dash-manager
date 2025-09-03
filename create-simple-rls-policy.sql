-- Script pour créer une politique RLS simple et fonctionnelle
-- À exécuter dans le Dashboard Supabase SQL Editor

-- 1. D'abord, vérifier les politiques existantes
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 2. Si vous voyez des politiques, notez leurs noms
-- Puis allez dans Dashboard > Authentication > Policies > storage.objects
-- Et supprimez-les toutes

-- 3. Créer une fonction helper pour vérifier l'accès
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Check if user is a team member
  IF EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE project_id = project_id_param
    AND user_id = auth.uid()
    AND status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 4. Maintenant, allez dans Dashboard > Authentication > Policies
-- Cliquez sur "New Policy" pour storage.objects
-- Et créez ces politiques avec les expressions EXACTES suivantes :

/*
=====================================
POLITIQUE 1: INSERT (Upload)
=====================================
Policy name: storage_insert_project_files
Table: storage.objects
Allowed operation: INSERT
Target roles: authenticated

WITH CHECK expression (copiez exactement):
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access(SPLIT_PART(name, '/', 2)::uuid)

=====================================
POLITIQUE 2: SELECT (View)
=====================================
Policy name: storage_select_project_files
Table: storage.objects
Allowed operation: SELECT
Target roles: authenticated

USING expression (copiez exactement):
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access(SPLIT_PART(name, '/', 2)::uuid)

=====================================
POLITIQUE 3: UPDATE
=====================================
Policy name: storage_update_project_files
Table: storage.objects
Allowed operation: UPDATE
Target roles: authenticated

USING expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access(SPLIT_PART(name, '/', 2)::uuid)

WITH CHECK expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access(SPLIT_PART(name, '/', 2)::uuid)

=====================================
POLITIQUE 4: DELETE
=====================================
Policy name: storage_delete_project_files
Table: storage.objects
Allowed operation: DELETE
Target roles: authenticated

USING expression:
-------------------------------------------
bucket_id = 'project-files' 
AND name LIKE 'projects/%' 
AND public.user_has_project_access(SPLIT_PART(name, '/', 2)::uuid)
*/

-- 5. Test de vérification après création des politiques
SELECT 
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    hra.project_id,
    p.title as projet,
    public.user_has_project_access(hra.project_id) as a_acces
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
LIMIT 5;

-- 6. Si ça ne fonctionne toujours pas, essayez cette politique ultra-simple :
/*
POLITIQUE TEMPORAIRE DE TEST:
Policy name: temp_allow_all_authenticated
Table: storage.objects
Allowed operation: INSERT
Target roles: authenticated

WITH CHECK expression:
bucket_id = 'project-files'

Ceci permettra à TOUS les utilisateurs authentifiés d'uploader.
Si ça marche, le problème vient de la logique de vérification.
*/