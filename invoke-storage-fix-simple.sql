-- Script simple pour corriger les politiques RLS du Drive
-- À exécuter dans le Dashboard SQL Editor de Supabase

-- Option 1: Créer la fonction exec_sql si elle n'existe pas
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Option 2: Créer directement une fonction pour fixer les politiques
CREATE OR REPLACE FUNCTION public.fix_storage_policies_now()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    policy_count integer := 0;
BEGIN
    -- Activer RLS
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    
    -- Tenter de créer chaque politique (ignorer si elle existe déjà)
    BEGIN
        CREATE POLICY "allow_all_authenticated_upload" 
        ON storage.objects FOR INSERT TO authenticated 
        WITH CHECK (bucket_id = 'project-files' AND name LIKE 'projects/%');
        policy_count := policy_count + 1;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Policy allow_all_authenticated_upload already exists';
    END;
    
    BEGIN
        CREATE POLICY "allow_all_authenticated_view" 
        ON storage.objects FOR SELECT TO authenticated 
        USING (bucket_id = 'project-files' AND name LIKE 'projects/%');
        policy_count := policy_count + 1;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Policy allow_all_authenticated_view already exists';
    END;
    
    BEGIN
        CREATE POLICY "allow_all_authenticated_update" 
        ON storage.objects FOR UPDATE TO authenticated 
        USING (bucket_id = 'project-files' AND name LIKE 'projects/%')
        WITH CHECK (bucket_id = 'project-files' AND name LIKE 'projects/%');
        policy_count := policy_count + 1;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Policy allow_all_authenticated_update already exists';
    END;
    
    BEGIN
        CREATE POLICY "allow_all_authenticated_delete" 
        ON storage.objects FOR DELETE TO authenticated 
        USING (bucket_id = 'project-files' AND name LIKE 'projects/%');
        policy_count := policy_count + 1;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Policy allow_all_authenticated_delete already exists';
    END;
    
    RETURN json_build_object(
        'success', true,
        'policies_created_or_verified', policy_count,
        'message', 'Les politiques RLS ont été appliquées ou vérifiées'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'hint', 'Vous devez avoir les droits admin pour modifier storage.objects'
    );
END;
$$;

-- Exécuter la fonction
SELECT fix_storage_policies_now();

-- Vérifier les politiques existantes
SELECT 
    policyname,
    cmd as operation,
    roles::text[] as target_roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- Vérifier les candidats qui peuvent maintenant uploader
SELECT 
    cp.first_name || ' ' || cp.last_name as candidat,
    COUNT(DISTINCT hra.project_id) as projets_acceptes,
    STRING_AGG(DISTINCT p.title, ', ') as projets
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
GROUP BY cp.first_name, cp.last_name
ORDER BY candidat;

-- Si tout fonctionne, vous devriez voir :
-- 1. Les 4 politiques créées ou vérifiées
-- 2. La liste des candidats avec leurs projets
-- Les candidats peuvent maintenant uploader dans le Drive !