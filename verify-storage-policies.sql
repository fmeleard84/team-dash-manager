-- Script pour vérifier l'état des politiques RLS et tester l'accès
-- À exécuter dans le Dashboard SQL Editor de Supabase

-- 1. Vérifier les politiques existantes sur storage.objects
SELECT 
    policyname,
    cmd as operation,
    permissive,
    roles::text[] as target_roles,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 2. Si aucune politique n'apparaît, les créer manuellement
-- IMPORTANT: Si vous voyez des politiques ci-dessus, passez directement à l'étape 3

-- Si pas de politiques, décommentez et exécutez ceci :
/*
DO $$
BEGIN
    -- Politique pour Upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%upload%'
    ) THEN
        EXECUTE 'CREATE POLICY "enable_upload_for_authenticated" 
        ON storage.objects FOR INSERT TO authenticated 
        WITH CHECK (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
        RAISE NOTICE 'Created upload policy';
    END IF;

    -- Politique pour View
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%view%'
    ) THEN
        EXECUTE 'CREATE POLICY "enable_view_for_authenticated" 
        ON storage.objects FOR SELECT TO authenticated 
        USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
        RAISE NOTICE 'Created view policy';
    END IF;

    -- Politique pour Update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%update%'
    ) THEN
        EXECUTE 'CREATE POLICY "enable_update_for_authenticated" 
        ON storage.objects FOR UPDATE TO authenticated 
        USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'')
        WITH CHECK (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
        RAISE NOTICE 'Created update policy';
    END IF;

    -- Politique pour Delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%delete%'
    ) THEN
        EXECUTE 'CREATE POLICY "enable_delete_for_authenticated" 
        ON storage.objects FOR DELETE TO authenticated 
        USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
        RAISE NOTICE 'Created delete policy';
    END IF;
END $$;
*/

-- 3. Vérifier que RLS est activé sur storage.objects
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 4. Tester l'accès pour un candidat spécifique
-- CDP FM 2708 a 6 projets, testons avec un de ses projets
SELECT 
    'CDP FM 2708 CDP2708' as candidat,
    'e64bc15d-e510-4e56-9502-a34be987218c' as user_id,
    'd7dff6ec-5019-40ab-a00f-8bac8806eca7' as project_id,
    'client 2 projet 2' as projet,
    'projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/test.pdf' as exemple_fichier,
    'Ce candidat devrait pouvoir uploader dans ce chemin' as status;

-- 5. Résumé final
SELECT 
    'RÉSUMÉ' as section,
    COUNT(*) as nombre_politiques,
    'Les candidats peuvent uploader si au moins 4 politiques existent' as conclusion
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Si vous voyez 4+ politiques ci-dessus, les candidats peuvent uploader !
-- Testez maintenant dans l'interface candidat