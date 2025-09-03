-- First, check what assignments we have for the project
SELECT 
  ra.id,
  ra.profile_id,
  ra.seniority,
  ra.booking_status,
  ra.candidate_id,
  hp.name as profile_name
FROM hr_resource_assignments ra
LEFT JOIN hr_profiles hp ON hp.id = ra.profile_id
WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
  AND ra.booking_status = 'accepted';

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
WHERE EXISTS (
  SELECT 1 FROM hr_resource_assignments ra
  WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
    AND ra.booking_status = 'accepted'
    AND (ra.candidate_id = cp.id 
         OR (ra.profile_id = cp.profile_id AND ra.seniority = cp.seniority))
);

-- Create test candidates for assignments without candidate_id
INSERT INTO candidate_profiles (
  first_name,
  last_name,
  email,
  phone,
  profile_id,
  seniority,
  status,
  is_email_verified
)
SELECT DISTINCT
  'Test' as first_name,
  COALESCE(hp.name, 'Resource') || ' ' || ra.seniority as last_name,
  'test-' || ra.id || '@example.com' as email,
  '+33600000001' as phone,
  ra.profile_id,
  ra.seniority,
  'disponible' as status,
  true as is_email_verified
FROM hr_resource_assignments ra
LEFT JOIN hr_profiles hp ON hp.id = ra.profile_id
WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
  AND ra.booking_status = 'accepted'
  AND ra.candidate_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM candidate_profiles cp
    WHERE cp.profile_id = ra.profile_id 
      AND cp.seniority = ra.seniority
  );

-- Update assignments with the newly created candidate IDs
UPDATE hr_resource_assignments ra
SET candidate_id = (
  SELECT cp.id 
  FROM candidate_profiles cp
  WHERE cp.profile_id = ra.profile_id 
    AND cp.seniority = ra.seniority
    AND cp.status = 'disponible'
  LIMIT 1
)
WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
  AND ra.booking_status = 'accepted'
  AND ra.candidate_id IS NULL;

-- Final check: show all assignments with their candidates
SELECT 
  ra.id as assignment_id,
  ra.booking_status,
  ra.candidate_id,
  cp.first_name || ' ' || cp.last_name as candidate_name,
  cp.email as candidate_email,
  hp.name as profile_name,
  ra.seniority
FROM hr_resource_assignments ra
LEFT JOIN candidate_profiles cp ON cp.id = ra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = ra.profile_id
WHERE ra.project_id = '5221da5d-783a-4637-a400-937af8dabaa6'
  AND ra.booking_status = 'accepted';