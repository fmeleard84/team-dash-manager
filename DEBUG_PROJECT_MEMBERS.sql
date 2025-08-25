-- ================================================
-- DEBUG PROJECT MEMBERS QUERY
-- ================================================
-- Use this to check what members exist for a specific project
-- Replace 'YOUR_PROJECT_ID' with the actual project ID
-- ================================================

-- Check project_bookings table
SELECT 
  pb.project_id,
  pb.candidate_id,
  pb.status,
  p.email,
  p.first_name,
  p.last_name
FROM project_bookings pb
LEFT JOIN profiles p ON p.id = pb.candidate_id
WHERE pb.project_id = 'YOUR_PROJECT_ID'
  AND pb.status IN ('accepted', 'confirmed');

-- Check hr_resource_assignments table
SELECT 
  hra.project_id,
  hra.candidate_id,
  hra.status,
  p.email,
  p.first_name,
  p.last_name
FROM hr_resource_assignments hra
LEFT JOIN profiles p ON p.id = hra.candidate_id
WHERE hra.project_id = 'YOUR_PROJECT_ID'
  AND hra.status IN ('active', 'confirmed', 'accepted');

-- Check project owner
SELECT 
  pr.id as project_id,
  pr.title as project_title,
  pr.owner_id,
  pr.user_id,
  COALESCE(pr.owner_id, pr.user_id) as actual_owner_id,
  p.email as owner_email,
  p.first_name as owner_name
FROM projects pr
LEFT JOIN profiles p ON p.id = COALESCE(pr.owner_id, pr.user_id)
WHERE pr.id = 'YOUR_PROJECT_ID';

-- Check if candidate_profiles table has data
SELECT 
  cp.email,
  cp.position,
  p.first_name,
  p.last_name
FROM candidate_profiles cp
JOIN profiles p ON p.email = cp.email
WHERE p.id IN (
  SELECT candidate_id 
  FROM project_bookings 
  WHERE project_id = 'YOUR_PROJECT_ID'
    AND status IN ('accepted', 'confirmed')
);