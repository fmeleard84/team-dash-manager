-- Debug RLS issue for candidate uploads
-- À exécuter dans le Dashboard SQL de Supabase

-- 1. Vérifier les politiques actuelles sur storage.objects
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 2. Tester manuellement la condition RLS pour le candidat CDP FM 2708
-- Simuler ce que fait la politique RLS
WITH candidate_check AS (
    SELECT 
        cp.id as candidate_id,
        cp.user_id,
        cp.email,
        cp.first_name,
        cp.last_name,
        hra.project_id,
        hra.booking_status,
        p.id as auth_user_id,
        p.email as auth_email,
        -- Test si le candidat passerait la vérification RLS
        CASE 
            WHEN cp.user_id = 'e64bc15d-e510-4e56-9502-a34be987218c' 
                AND hra.booking_status = 'accepted'
                AND hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
            THEN 'SHOULD PASS RLS ✅'
            ELSE 'SHOULD FAIL RLS ❌'
        END as rls_check
    FROM candidate_profiles cp
    JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
    LEFT JOIN profiles p ON p.id = cp.user_id
    WHERE cp.first_name = 'CDP FM 2708'
        AND hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
)
SELECT * FROM candidate_check;

-- 3. Vérifier TOUTES les politiques qui pourraient bloquer
-- Il pourrait y avoir des politiques conflictuelles
SELECT 
    policyname,
    CASE 
        WHEN cmd = 'INSERT' THEN '📝 INSERT'
        WHEN cmd = 'SELECT' THEN '👁️ SELECT'
        WHEN cmd = 'UPDATE' THEN '✏️ UPDATE'
        WHEN cmd = 'DELETE' THEN '🗑️ DELETE'
        ELSE cmd
    END as operation,
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE'
        ELSE '❌ RESTRICTIVE'
    END as type,
    substring(with_check::text, 1, 100) as check_condition
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. Tester le SPLIT_PART qui extrait le project_id du path
SELECT 
    'projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/test.pdf' as full_path,
    SPLIT_PART('projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/test.pdf', '/', 2) as extracted_project_id,
    'd7dff6ec-5019-40ab-a00f-8bac8806eca7' as expected_project_id,
    SPLIT_PART('projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/test.pdf', '/', 2) = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7' as match;