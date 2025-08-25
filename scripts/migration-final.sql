-- ========================================
-- SCRIPT DE MIGRATION FINAL - ADAPTATIF
-- ========================================

-- ÉTAPE 1: DIAGNOSTIC COMPLET
-- ========================================

-- 1a. Voir la structure de candidate_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'candidate_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1b. Voir la structure de hr_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'hr_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1c. Voir les assignations actuelles du projet
SELECT 
  hra.id,
  hra.project_id,
  hra.profile_id,
  hra.candidate_id,
  hra.booking_status,
  hp.name as hr_profile_name
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 1d. Voir les hr_profiles à migrer
SELECT 
  hra.id as assignment_id,
  hp.id as hr_profile_id,
  hp.name as hr_name,
  hp.category_id,
  hp.base_price
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL;

-- ÉTAPE 2: MIGRATION (après avoir vu la structure)
-- ========================================

-- 2a. Créer les candidate_profiles MINIMAL (ajustez selon les colonnes disponibles)
-- Version minimaliste qui devrait fonctionner avec n'importe quelle structure
INSERT INTO candidate_profiles (email)
SELECT DISTINCT
  CASE 
    WHEN hp.name LIKE '%@%' THEN hp.name
    ELSE LOWER(REPLACE(hp.name, ' ', '.')) || '@temp.com'
  END as email
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

-- 2b. Mettre à jour les assignations pour utiliser candidate_id
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

-- ÉTAPE 3: VÉRIFICATION
-- ========================================

-- 3a. Vérifier que toutes les assignations ont maintenant un candidate_id
SELECT 
  hra.id,
  hra.profile_id,
  hra.candidate_id,
  cp.email as candidate_email,
  hp.name as old_hr_profile_name,
  hra.booking_status
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3b. Compter les résultats
SELECT 
  COUNT(*) as total_assignments,
  COUNT(candidate_id) as with_candidate_id,
  COUNT(profile_id) as with_profile_id,
  COUNT(CASE WHEN candidate_id IS NULL AND profile_id IS NOT NULL THEN 1 END) as need_migration
FROM hr_resource_assignments
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- ÉTAPE 4: NETTOYAGE (OPTIONNEL)
-- ========================================

-- Une fois que tout fonctionne, vous pouvez nettoyer :
-- UPDATE hr_resource_assignments 
-- SET profile_id = NULL 
-- WHERE candidate_id IS NOT NULL 
-- AND project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';