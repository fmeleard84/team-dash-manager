-- Update candidate_event_notifications to use proper event statuses
ALTER TABLE candidate_event_notifications 
DROP CONSTRAINT IF EXISTS candidate_event_notifications_status_check;

-- Add proper constraint for event statuses
ALTER TABLE candidate_event_notifications 
ADD CONSTRAINT candidate_event_notifications_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'read', 'archived'));

-- Set default status to pending for new events
ALTER TABLE candidate_event_notifications 
ALTER COLUMN status SET DEFAULT 'pending';

-- Update existing 'unread' status to 'pending'
UPDATE candidate_event_notifications 
SET status = 'pending' 
WHERE status = 'unread';