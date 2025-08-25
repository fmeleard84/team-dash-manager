// Script pour vérifier et migrer les assignations
console.log(`
===========================================
VÉRIFICATION DES ASSIGNATIONS DE PROJET
===========================================

Pour voir les assignations actuelles et appliquer la migration si nécessaire.

1. D'abord, allez sur : https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/editor
2. Exécutez cette requête SQL pour voir l'état actuel :

-- Requête pour voir l'état actuel des assignations
SELECT 
  hra.id,
  hra.project_id,
  hra.profile_id,
  hra.candidate_id,
  hra.booking_status,
  hp.name as hr_profile_name,
  hp.profile_id as hr_profile_link,
  cp.email as candidate_email,
  cp.job_title as candidate_job_title
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

3. Si vous voyez des lignes avec profile_id mais sans candidate_id, exécutez ces requêtes pour migrer :

-- Étape 1: D'abord, voir quels hr_profiles ont besoin de migration
SELECT 
  hra.id as assignment_id,
  hra.profile_id,
  hp.name,
  hp.profile_id as linked_profile_id,
  p.email,
  p.first_name,
  p.last_name
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
LEFT JOIN profiles p ON p.id = hp.profile_id
WHERE hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL;

-- Étape 2: Créer les candidate_profiles manquants (si email existe)
INSERT INTO candidate_profiles (email, profile_id, job_title, user_id, is_active)
SELECT DISTINCT
  p.email,
  p.id as profile_id,
  'Consultant' as job_title,
  p.id as user_id,
  true as is_active
FROM hr_resource_assignments hra
JOIN hr_profiles hp ON hp.id = hra.profile_id
JOIN profiles p ON p.id = hp.profile_id
WHERE hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  AND p.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM candidate_profiles cp WHERE cp.email = p.email
  );

-- Étape 3: Mettre à jour les assignations pour utiliser candidate_id
UPDATE hr_resource_assignments hra
SET candidate_id = cp.id
FROM hr_profiles hp
JOIN profiles p ON p.id = hp.profile_id
JOIN candidate_profiles cp ON cp.email = p.email
WHERE hra.profile_id = hp.id
  AND hra.candidate_id IS NULL;

-- Étape 4: Vérifier le résultat
SELECT 
  hra.id,
  hra.candidate_id,
  cp.email,
  cp.job_title,
  hra.booking_status
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

4. Une fois migré, tous les membres devraient apparaître dans le Planning !
`);