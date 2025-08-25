-- ================================================
-- ADD EDIT HISTORY COLUMN TO TIME TRACKING
-- ================================================
-- Run this in Supabase SQL Editor to add the edit_history column
-- This will allow tracking of all duration modifications with comments
-- ================================================

-- Add edit_history column to store modification history
ALTER TABLE time_tracking_sessions 
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]';

-- The edit_history will store an array of objects like:
-- [
--   {
--     "edited_at": "2025-08-21T10:00:00Z",
--     "old_duration": 60,
--     "new_duration": 90,
--     "reason": "J'ai oublié de démarrer le chronomètre au début de la réunion",
--     "edited_by": "user@example.com"
--   }
-- ]

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'time_tracking_sessions' 
AND column_name = 'edit_history';