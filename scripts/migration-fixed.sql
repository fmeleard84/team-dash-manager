-- ========================================
-- SCRIPT DE MIGRATION CORRIGÉ
-- ========================================

-- 1. DIAGNOSTIC : Voir la structure et les données actuelles
-- 1a. Voir toutes les assignations du projet
SELECT 
  hra.id,
  hra.project_id,
  hra.profile_id,
  hra.candidate_id,
  hra.booking_status
FROM hr_resource_assignments hra
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 1b. Voir les colonnes de hr_profiles (pour comprendre la structure)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_profiles' 
AND table_schema = 'public';

-- 1c. Voir les hr_profiles liés aux assignations
SELECT DISTINCT
  hp.*
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.profile_id IS NOT NULL;

-- 2. MIGRATION SIMPLIFIÉE
-- Si les hr_profiles ont un champ "name" avec format "email@domain.com" ou similaire
-- On va créer des candidate_profiles basés sur ces données

-- 2a. D'abord, voir ce qu'on peut migrer
SELECT 
  hra.id as assignment_id,
  hra.profile_id,
  hp.id as hr_profile_id,
  hp.name as hr_name,
  hp.category_id
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL;

-- 2b. Créer des candidate_profiles basés sur hr_profiles
-- (Ajustez selon ce que vous voyez dans les requêtes ci-dessus)
INSERT INTO candidate_profiles (
  email,
  job_title,
  is_active,
  first_name,
  last_name
)
SELECT DISTINCT
  CASE 
    WHEN hp.name LIKE '%@%' THEN hp.name
    ELSE LOWER(REPLACE(hp.name, ' ', '.')) || '@temp.com'
  END as email,
  'Consultant' as job_title,
  true as is_active,
  SPLIT_PART(hp.name, ' ', 1) as first_name,
  SPLIT_PART(hp.name, ' ', 2) as last_name
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM candidate_profiles cp 
    WHERE cp.email = CASE 
      WHEN hp.name LIKE '%@%' THEN hp.name
      ELSE LOWER(REPLACE(hp.name, ' ', '.')) || '@temp.com'
    END
  );

-- 2c. Mettre à jour les assignations pour utiliser candidate_id
UPDATE hr_resource_assignments hra
SET candidate_id = cp.id
FROM hr_profiles hp
JOIN candidate_profiles cp ON (
  cp.email = CASE 
    WHEN hp.name LIKE '%@%' THEN hp.name
    ELSE LOWER(REPLACE(hp.name, ' ', '.')) || '@temp.com'
  END
)
WHERE hra.profile_id = hp.id
  AND hra.candidate_id IS NULL
  AND hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3. VÉRIFICATION FINALE
-- Voir si tous les assignments ont maintenant un candidate_id
SELECT 
  hra.id,
  hra.candidate_id,
  cp.email,
  cp.job_title,
  cp.first_name,
  cp.last_name,
  hra.booking_status
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 4. OPTIONNEL : Nettoyer profile_id une fois migré
-- UPDATE hr_resource_assignments 
-- SET profile_id = NULL 
-- WHERE candidate_id IS NOT NULL 
-- AND project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';