-- Update status values to match new constraint
UPDATE candidate_event_notifications 
SET status = 'pending' 
WHERE status = 'unread';

-- Add proper constraint for event statuses
ALTER TABLE candidate_event_notifications 
ADD CONSTRAINT candidate_event_notifications_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'read', 'archived'));

-- Set default status to pending for new events
ALTER TABLE candidate_event_notifications 
ALTER COLUMN status SET DEFAULT 'pending';