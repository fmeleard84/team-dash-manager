-- ========================================
-- ANALYSE COMPLÈTE DE LA STRUCTURE DU PROJET
-- ========================================

-- 1. INFORMATIONS DU PROJET
SELECT 
  id,
  title,
  status,
  owner_id,
  created_at
FROM projects 
WHERE title LIKE '%Comptable junior client_2%' 
   OR id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 2. QUI EST LE CLIENT (OWNER)
SELECT 
  p.id as project_id,
  p.title,
  prof.id as client_id,
  prof.email as client_email,
  prof.first_name as client_name
FROM projects p
JOIN profiles prof ON prof.id = p.owner_id
WHERE p.id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3. TOUTES LES TABLES QUI POURRAIENT CONTENIR DES ACCEPTATIONS
-- 3a. hr_resource_assignments (ressources planifiées)
SELECT 
  hra.*,
  cp.email as candidate_email,
  hp.name as hr_profile_name
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3b. candidate_project_assignments (assignations spécifiques aux candidats)
SELECT * FROM candidate_project_assignments
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3c. project_bookings (demandes de booking)
SELECT 
  pb.*,
  cp.email as candidate_email
FROM project_bookings pb
LEFT JOIN candidate_profiles cp ON cp.id = pb.candidate_id
WHERE pb.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3d. candidate_notifications (notifications envoyées)
SELECT 
  cn.*,
  cp.email as candidate_email
FROM candidate_notifications cn
LEFT JOIN candidate_profiles cp ON cp.id = cn.candidate_id
WHERE cn.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 4. RECHERCHE DE L'ASSISTANT COMPTABLE
-- Chercher dans toutes les tables qui pourraient avoir une référence
SELECT 
  'candidate_profiles' as source_table,
  id,
  email,
  first_name,
  last_name
FROM candidate_profiles
WHERE email LIKE '%assistant%' 
   OR first_name LIKE '%Assistant%'
   OR last_name LIKE '%comptable%'
UNION ALL
SELECT 
  'hr_profiles' as source_table,
  id,
  name as email,
  '' as first_name,
  '' as last_name
FROM hr_profiles
WHERE name LIKE '%Assistant%' 
   OR name LIKE '%comptable%';

-- 5. STRUCTURE DES TABLES IMPORTANTES
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hr_resource_assignments', 'candidate_project_assignments', 'project_bookings')
ORDER BY table_name, ordinal_position;

-- 6. VOIR TOUS LES CANDIDATS LIÉS AU PROJET (toutes méthodes)
-- Via hr_resource_assignments
SELECT 'hr_resource_assignments' as source, * 
FROM hr_resource_assignments 
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
UNION ALL
-- Via candidate_project_assignments  
SELECT 'candidate_project_assignments' as source, 
  id, NULL, project_id, NULL, candidate_id, NULL, NULL, NULL, NULL, NULL, status, NULL, created_at, updated_at
FROM candidate_project_assignments
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
UNION ALL
-- Via project_bookings
SELECT 'project_bookings' as source,
  id, NULL, project_id, NULL, candidate_id, NULL, NULL, NULL, NULL, NULL, status, NULL, created_at, updated_at
FROM project_bookings
WHERE project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';