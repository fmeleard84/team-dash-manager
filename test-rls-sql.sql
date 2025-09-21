-- TEST RLS : Vérification des assignments IA pour le projet
-- Project ID: 5ec653f5-5de9-4291-a2d9-e301425adbad
-- Candidat ID: 6cc0150b-30ef-4020-ba1b-ca20ba685310 (Francis)

-- 1. Voir TOUS les assignments du projet (sans RLS)
SELECT
  hra.id,
  hra.project_id,
  hra.profile_id,
  hra.candidate_id,
  hra.booking_status,
  hp.name as profile_name,
  hp.is_ai,
  cp.first_name as candidate_name
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hra.profile_id = hp.id
LEFT JOIN candidate_profiles cp ON hra.candidate_id = cp.id
WHERE hra.project_id = '5ec653f5-5de9-4291-a2d9-e301425adbad'
ORDER BY hp.is_ai DESC;

-- 2. Compter les assignments par type
SELECT
  hp.is_ai,
  COUNT(*) as count,
  STRING_AGG(hp.name, ', ') as profiles
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hra.profile_id = hp.id
WHERE hra.project_id = '5ec653f5-5de9-4291-a2d9-e301425adbad'
GROUP BY hp.is_ai;

-- 3. Vérifier les politiques RLS actives sur hr_resource_assignments
SELECT
  pol.polname as policy_name,
  pol.polcmd as command_type,
  pg_get_expr(pol.polqual, pol.polrelid) as policy_condition,
  pol.polroles::regrole[] as roles
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE cls.relname = 'hr_resource_assignments'
  AND nsp.nspname = 'public'
ORDER BY pol.polname;

-- 4. Vérifier les politiques RLS sur hr_profiles
SELECT
  pol.polname as policy_name,
  pol.polcmd as command_type,
  pg_get_expr(pol.polqual, pol.polrelid) as policy_condition,
  pol.polroles::regrole[] as roles
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE cls.relname = 'hr_profiles'
  AND nsp.nspname = 'public'
ORDER BY pol.polname;

-- 5. Test spécifique : assignments avec IA
SELECT
  'ASSIGNMENTS AVEC IA' as test_type,
  hra.id,
  hra.booking_status,
  hp.name,
  hp.is_ai,
  hra.candidate_id
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hra.profile_id = hp.id
WHERE hra.project_id = '5ec653f5-5de9-4291-a2d9-e301425adbad'
  AND hp.is_ai = true;

-- 6. Vérifier si RLS est activé
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('hr_resource_assignments', 'hr_profiles')
  AND schemaname = 'public';

-- INSTRUCTIONS :
-- 1. Exécutez ces requêtes dans le SQL Editor de Supabase
-- 2. Regardez particulièrement le résultat de la requête 1 et 5
-- 3. Si vous voyez des IA dans le résultat, alors le problème est RLS
-- 4. Si vous ne voyez pas d'IA, alors elles n'existent pas dans ce projet
-- 5. Les requêtes 3 et 4 montrent les politiques RLS qui filtrent l'accès