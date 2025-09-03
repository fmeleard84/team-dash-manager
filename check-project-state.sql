-- Check project state
SELECT id, title, status, owner_id, project_date
FROM projects 
WHERE id = '5221da5d-783a-4637-a400-937af8dabaa6';

-- Check resource assignments
SELECT 
  ra.id,
  ra.profile_id,
  ra.seniority,
  ra.booking_status,
  ra.candidate_id,
  hp.name as profile_name
FROM hr_resource_assignments ra
LEFT JOIN hr_profiles hp ON hp.id = ra.profile_id
WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6';

-- Check if candidates exist for these assignments
SELECT 
  cp.id,
  cp.first_name,
  cp.last_name,
  cp.email,
  cp.profile_id,
  cp.seniority,
  cp.status
FROM candidate_profiles cp
WHERE cp.profile_id IN (
  SELECT profile_id 
  FROM hr_resource_assignments 
  WHERE project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
);