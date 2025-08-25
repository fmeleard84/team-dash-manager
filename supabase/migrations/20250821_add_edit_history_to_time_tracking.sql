-- Add edit_history field to time_tracking_sessions to track modifications
ALTER TABLE time_tracking_sessions 
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]';

-- The edit_history will store an array of objects like:
-- {
--   "edited_at": "2025-08-21T10:00:00Z",
--   "old_duration": 60,
--   "new_duration": 90,
--   "reason": "J'ai oublié de démarrer le chronomètre au début de la réunion",
--   "edited_by": "user@example.com"
-- }