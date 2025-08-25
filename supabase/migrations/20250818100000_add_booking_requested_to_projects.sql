-- Add booking_requested field to projects table
-- This field tracks whether the client has requested to book the team
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS booking_requested BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.booking_requested IS 'Indicates whether the client has clicked "Booker l''équipe" to request team booking';