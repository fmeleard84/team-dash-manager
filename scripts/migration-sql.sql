-- ========================================
-- SCRIPT DE MIGRATION COMPLET
-- ========================================

-- 1. D'abord, voyons ce qu'on a dans hr_resource_assignments
SELECT 
  hra.*,
  hp.name as hr_profile_name,
  cp.email as candidate_email
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 2. Voyons les hr_profiles qui ont besoin de migration
SELECT 
  hra.id as assignment_id,
  hra.profile_id as hr_profile_id,
  hp.name as hr_name,
  hp.profile_id as linked_profile_id,
  p.email as profile_email,
  p.first_name,
  p.last_name
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
LEFT JOIN profiles p ON p.id = hp.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.candidate_id IS NULL;

-- 3. Si vous voyez des résultats ci-dessus, exécutez cette migration :

-- 3a. Créer les candidate_profiles pour les utilisateurs qui n'en ont pas
INSERT INTO candidate_profiles (
  email, 
  profile_id, 
  job_title, 
  user_id, 
  is_active,
  first_name,
  last_name
)
SELECT DISTINCT
  p.email,
  p.id as profile_id,
  'Consultant' as job_title,
  p.id as user_id,
  true as is_active,
  p.first_name,
  p.last_name
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
JOIN profiles p ON p.id = hp.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  AND p.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM candidate_profiles cp WHERE cp.email = p.email
  );

-- 3b. Mettre à jour les assignations pour utiliser candidate_id
UPDATE hr_resource_assignments hra
SET candidate_id = cp.id
FROM hr_profiles hp
JOIN profiles p ON p.id = hp.profile_id
JOIN candidate_profiles cp ON cp.email = p.email
WHERE hra.profile_id = hp.id
  AND hra.candidate_id IS NULL
  AND hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 4. Vérifier que la migration a fonctionné
SELECT 
  hra.id,
  hra.candidate_id,
  cp.email,
  cp.job_title,
  cp.first_name,
  cp.last_name,
  hra.booking_status
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 5. Si tout est OK, vous pouvez optionnellement nettoyer profile_id
-- UPDATE hr_resource_assignments 
-- SET profile_id = NULL 
-- WHERE candidate_id IS NOT NULL;