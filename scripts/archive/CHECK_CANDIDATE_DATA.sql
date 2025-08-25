-- ============================================================================
-- VÉRIFIER LES DONNÉES POUR LES CANDIDATS
-- ============================================================================

-- 1. Structure de hr_resource_assignments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_resource_assignments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Données dans hr_resource_assignments
SELECT * FROM hr_resource_assignments LIMIT 5;

-- 3. Structure de candidate_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidate_profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Données de candidate_profiles pour l'email de test
SELECT * FROM candidate_profiles WHERE email LIKE '%ressource%';

-- 5. Vérifier les projets existants
SELECT id, title, status, owner_id FROM projects LIMIT 10;

-- 6. Vérifier les bookings
SELECT * FROM project_bookings LIMIT 10;