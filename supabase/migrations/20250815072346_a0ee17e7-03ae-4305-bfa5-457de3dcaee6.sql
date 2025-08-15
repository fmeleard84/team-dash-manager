-- Add 'completed' status to projects table
-- First, check if the status column allows 'completed' value
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add a new check constraint that includes 'completed'
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('pause', 'play', 'completed'));