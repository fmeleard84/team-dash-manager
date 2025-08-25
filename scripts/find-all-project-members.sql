-- ========================================
-- TROUVER TOUS LES MEMBRES DU PROJET
-- ========================================

-- Le projet "Comptable junior client_2"
SET @project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 1. CLIENT (owner du projet)
SELECT 
  'CLIENT' as member_type,
  p.owner_id as user_id,
  prof.email,
  prof.first_name,
  prof.last_name,
  'Client' as role
FROM projects p
JOIN profiles prof ON prof.id = p.owner_id
WHERE p.id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 2. CANDIDATS via hr_resource_assignments (méthode principale)
SELECT 
  'HR_ASSIGNMENT' as member_type,
  hra.id as assignment_id,
  hra.candidate_id,
  hra.profile_id,
  hra.booking_status,
  cp.email as candidate_email,
  hp.name as hr_profile_name
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 3. CANDIDATS via candidate_project_assignments (table dédiée)
SELECT 
  'CANDIDATE_ASSIGNMENT' as member_type,
  cpa.id,
  cpa.candidate_id,
  cpa.status,
  cp.email,
  cp.first_name,
  cp.last_name
FROM candidate_project_assignments cpa
JOIN candidate_profiles cp ON cp.id = cpa.candidate_id
WHERE cpa.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 4. CANDIDATS via project_bookings (demandes de réservation)
SELECT 
  'PROJECT_BOOKING' as member_type,
  pb.id,
  pb.candidate_id,
  pb.status,
  pb.resource_assignment_id,
  cp.email,
  cp.first_name,
  cp.last_name
FROM project_bookings pb
JOIN candidate_profiles cp ON cp.id = pb.candidate_id
WHERE pb.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 5. CANDIDATS via candidate_notifications (qui ont reçu une notification)
SELECT 
  'NOTIFICATION' as member_type,
  cn.id,
  cn.candidate_id,
  cn.status as notification_status,
  cn.title,
  cp.email,
  cp.first_name,
  cp.last_name
FROM candidate_notifications cn
JOIN candidate_profiles cp ON cp.id = cn.candidate_id
WHERE cn.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';

-- 6. RECHERCHE GLOBALE : Qui est l'Assistant Comptable ?
-- Recherche par métier dans hr_resource_assignments
SELECT 
  'SEARCH_BY_JOB' as search_type,
  hra.*,
  cp.email,
  cp.first_name,
  cp.last_name
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.job_title LIKE '%Assistant%' 
   OR hra.job_title LIKE '%comptable%';

-- 7. SOLUTION POTENTIELLE : Si l'Assistant Comptable existe mais n'est pas lié au projet
-- Chercher tous les candidats avec un métier comptable
SELECT 
  cp.id,
  cp.email,
  cp.first_name,
  cp.last_name,
  cp.job_title,
  EXISTS (
    SELECT 1 FROM hr_resource_assignments hra 
    WHERE hra.candidate_id = cp.id 
    AND hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738'
  ) as is_assigned_to_project
FROM candidate_profiles cp
WHERE cp.job_title LIKE '%comptable%' 
   OR cp.job_title LIKE '%Assistant%';

-- 8. VÉRIFIER LA COHÉRENCE : Y a-t-il des assignations orphelines ?
SELECT 
  'ORPHAN_CHECK' as check_type,
  hra.id,
  hra.candidate_id IS NOT NULL as has_candidate_id,
  hra.profile_id IS NOT NULL as has_profile_id,
  hra.booking_status,
  CASE 
    WHEN hra.candidate_id IS NOT NULL THEN 
      (SELECT email FROM candidate_profiles WHERE id = hra.candidate_id)
    WHEN hra.profile_id IS NOT NULL THEN
      (SELECT name FROM hr_profiles WHERE id = hra.profile_id)
    ELSE 'NO_REFERENCE'
  END as member_reference
FROM hr_resource_assignments hra
WHERE hra.project_id = '16fd6a53-d0ed-49e9-aec6-99813eb23738';