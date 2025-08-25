-- ================================================
-- ENABLE REALTIME FOR TIME TRACKING TABLES
-- ================================================
-- Run this in Supabase SQL Editor to enable realtime
-- for time tracking dashboard updates
-- ================================================

-- 1. Enable realtime for active_time_tracking table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS active_time_tracking;

-- 2. Enable realtime for time_tracking_sessions table  
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS time_tracking_sessions;

-- 3. Verify realtime is enabled
SELECT 
  tablename,
  'Enabled for realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('active_time_tracking', 'time_tracking_sessions')
ORDER BY tablename;

-- If the above query returns both tables, realtime is enabled!
-- The dashboard should now update in real-time when candidates start/stop tracking