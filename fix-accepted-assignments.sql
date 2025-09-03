-- Fix accepted assignments without candidate_id
-- This will clean up the data so candidates don't see already accepted assignments

-- First, let's see what we have
SELECT 
    a.id,
    a.project_id,
    a.profile_id,
    a.seniority,
    a.booking_status,
    a.candidate_id,
    p.title as project_title
FROM hr_resource_assignments a
LEFT JOIN projects p ON a.project_id = p.id
WHERE a.booking_status = 'accepted' AND a.candidate_id IS NULL;

-- For assignments that are accepted but have no candidate_id, 
-- we should either:
-- 1. Reset them to 'recherche' status if we want to re-open them
-- 2. Set a placeholder candidate_id if we want to keep them accepted

-- Option 1: Reset orphaned accepted assignments to recherche
UPDATE hr_resource_assignments
SET 
    booking_status = 'recherche',
    updated_at = now()
WHERE 
    booking_status = 'accepted' 
    AND candidate_id IS NULL;

-- Return the count of updated rows
SELECT COUNT(*) as fixed_assignments
FROM hr_resource_assignments
WHERE booking_status = 'recherche';