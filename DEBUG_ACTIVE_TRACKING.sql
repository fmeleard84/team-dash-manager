-- ================================================
-- DEBUG ACTIVE TIME TRACKING
-- ================================================
-- Use this to check what active tracking sessions exist
-- ================================================

-- 1. Check all active tracking sessions
SELECT 
  att.*,
  p.title as project_title,
  p.owner_id,
  p.user_id
FROM active_time_tracking att
LEFT JOIN projects p ON p.id = att.project_id
WHERE att.status IN ('active', 'paused')
ORDER BY att.start_time DESC;

-- 2. Check projects for a specific client (replace with actual user ID)
-- Replace 'YOUR_USER_ID' with the actual client user ID
SELECT 
  p.id,
  p.title,
  p.status,
  p.owner_id,
  p.user_id,
  CASE 
    WHEN p.owner_id = 'YOUR_USER_ID' THEN 'owner'
    WHEN p.user_id = 'YOUR_USER_ID' THEN 'user'
    ELSE 'none'
  END as client_role
FROM projects p
WHERE p.owner_id = 'YOUR_USER_ID' OR p.user_id = 'YOUR_USER_ID';

-- 3. Check active tracking for client's projects
SELECT 
  att.*,
  p.title as project_title
FROM active_time_tracking att
INNER JOIN projects p ON p.id = att.project_id
WHERE (p.owner_id = 'YOUR_USER_ID' OR p.user_id = 'YOUR_USER_ID')
  AND att.status IN ('active', 'paused');

-- 4. Check if realtime is enabled on active_time_tracking
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE tablename = 'active_time_tracking';