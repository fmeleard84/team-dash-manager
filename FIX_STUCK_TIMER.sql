-- ================================================
-- FIX STUCK TIMER FOR CANDIDATE
-- ================================================
-- Run this in Supabase SQL Editor to fix the stuck timer
-- ================================================

-- 1. Find the candidate
SELECT id, first_name, last_name, email 
FROM candidate_profiles 
WHERE email = 'fmeleard+ressource_2@gmail.com';

-- 2. Delete active tracking (replace CANDIDATE_ID with the ID from step 1)
DELETE FROM active_time_tracking 
WHERE candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = 'fmeleard+ressource_2@gmail.com'
);

-- 3. Mark any incomplete sessions as completed
UPDATE time_tracking_sessions 
SET 
  status = 'completed',
  end_time = NOW(),
  updated_at = NOW()
WHERE 
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = 'fmeleard+ressource_2@gmail.com'
  )
  AND status IN ('active', 'paused');

-- 4. Verify it worked
SELECT 
  'Active sessions remaining:' as check,
  COUNT(*) as count
FROM active_time_tracking 
WHERE candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = 'fmeleard+ressource_2@gmail.com'
);