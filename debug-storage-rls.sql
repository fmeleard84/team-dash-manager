-- Debug Storage RLS Issues for Candidates
-- Requête 1: Vérifier les politiques actuelles
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%member%';

-- Requête 2: Vérifier le lien user_id pour le candidat problématique
SELECT 
    cp.id,
    cp.first_name,
    cp.last_name,
    cp.user_id,
    cp.email,
    au.id as auth_user_id,
    au.email as auth_email
FROM candidate_profiles cp
LEFT JOIN auth.users au ON au.id = cp.user_id
WHERE cp.first_name = 'CDP FM 2708';

-- Requête 3: Vérifier si le candidat a bien une assignation valide
SELECT 
    hra.id,
    hra.project_id,
    hra.booking_status,
    hra.candidate_id,
    cp.user_id,
    cp.first_name
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';

-- Requête 4: Vérifier les politiques complètes storage pour debug
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Requête 5: Test de la logique RLS directement
SELECT 
    'Candidat validation' as test_type,
    cp.user_id,
    cp.first_name,
    hra.booking_status,
    hra.project_id,
    -- Simulation de la condition RLS
    CASE 
        WHEN cp.user_id = auth.uid() AND hra.booking_status = 'accepted' 
        THEN 'RLS_PASS' 
        ELSE 'RLS_FAIL' 
    END as rls_result
FROM candidate_profiles cp
JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
  AND cp.first_name = 'CDP FM 2708';