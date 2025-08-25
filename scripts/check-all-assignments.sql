-- ========================================
-- VÉRIFICATION COMPLÈTE DES ASSIGNATIONS
-- ========================================

-- 1. Voir TOUTES les assignations pour ce projet (sans filtre de booking_status)
SELECT 
  hra.id,
  hra.project_id,
  hra.booking_status,
  hra.candidate_id,
  hra.profile_id,
  cp.email as candidate_email,
  hp.name as hr_profile_name
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
ORDER BY hra.created_at;

-- 2. Voir les différents statuts de booking
SELECT 
  booking_status,
  COUNT(*) as count
FROM hr_resource_assignments
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
GROUP BY booking_status;

-- 3. Voir TOUS les projets et leurs assignations
SELECT 
  p.id,
  p.title,
  p.status as project_status,
  COUNT(hra.id) as total_assignments,
  COUNT(CASE WHEN hra.booking_status IN ('accepted', 'booké') THEN 1 END) as accepted_assignments
FROM projects p
LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
WHERE p.id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
GROUP BY p.id, p.title, p.status;

-- 4. Si vous ne voyez qu'une assignation, il faut peut-être :
-- a) Changer le booking_status des autres assignations
UPDATE hr_resource_assignments
SET booking_status = 'accepted'
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
AND booking_status NOT IN ('accepted', 'booké');

-- b) Ou créer de nouvelles assignations pour les membres de l'équipe
-- Exemple : ajouter un candidat à l'équipe
-- INSERT INTO hr_resource_assignments (project_id, candidate_id, booking_status)
-- VALUES ('16fd6a53-d0ed-49e9-aec6-99813eb23738', '[CANDIDATE_ID]', 'accepted');

-- 5. Pour voir tous les candidats disponibles
SELECT 
  cp.id,
  cp.email,
  cp.first_name,
  cp.last_name,
  COUNT(hra.id) as current_assignments
FROM candidate_profiles cp
LEFT JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
GROUP BY cp.id, cp.email, cp.first_name, cp.last_name
ORDER BY current_assignments;