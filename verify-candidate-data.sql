-- Vérification des données candidat pour CDP FM 2708
-- Projet: d7dff6ec-5019-40ab-a00f-8bac8806eca7

-- 1. Vérifier le candidat
SELECT 
    'CANDIDAT' as section,
    cp.id,
    cp.first_name,
    cp.last_name,
    cp.user_id,
    cp.email,
    cp.status,
    cp.qualification_status
FROM candidate_profiles cp
WHERE cp.first_name = 'CDP FM 2708';

-- 2. Vérifier les assignations du projet
SELECT 
    'ASSIGNATION' as section,
    hra.id,
    hra.project_id,
    hra.booking_status,
    hra.candidate_id,
    cp.user_id as candidate_user_id,
    cp.first_name,
    cp.email
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';

-- 3. Vérifier le projet et son owner
SELECT 
    'PROJET' as section,
    p.id,
    p.name,
    p.title,
    p.owner_id,
    p.status
FROM projects p
WHERE p.id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';

-- 4. Vérifier les utilisateurs auth (approximation)
SELECT 
    'AUTH_USERS_COUNT' as section,
    count(*) as total_users
FROM auth.users;

-- 5. Simulation de la logique RLS pour debug
SELECT 
    'RLS_SIMULATION' as section,
    cp.user_id as candidate_user_id,
    hra.booking_status,
    hra.project_id,
    -- Simuler le path
    'projects/' || hra.project_id || '/test-file.pdf' as simulated_path,
    -- Simuler SPLIT_PART(name, '/', 2)
    SPLIT_PART('projects/' || hra.project_id || '/test-file.pdf', '/', 2) as extracted_project_id,
    -- Vérifications RLS
    CASE 
        WHEN hra.booking_status = 'accepted' THEN 'booking_ok'
        ELSE 'booking_fail: ' || COALESCE(hra.booking_status, 'NULL')
    END as booking_check,
    CASE 
        WHEN hra.project_id::text = SPLIT_PART('projects/' || hra.project_id || '/test-file.pdf', '/', 2) THEN 'project_match_ok'
        ELSE 'project_match_fail'
    END as project_check
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
  AND cp.first_name = 'CDP FM 2708';