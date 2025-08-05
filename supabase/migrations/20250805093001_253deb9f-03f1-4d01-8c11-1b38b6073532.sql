-- Add booking_status to hr_resource_assignments
ALTER TABLE public.hr_resource_assignments 
ADD COLUMN booking_status TEXT NOT NULL DEFAULT 'recherche';

-- Create project_bookings table to track booking requests
CREATE TABLE public.project_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  resource_assignment_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_notifications table
CREATE TABLE public.candidate_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  project_id UUID NOT NULL,
  resource_assignment_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread', -- unread, read, expired
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.project_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_bookings
CREATE POLICY "Admins can manage all project bookings"
ON public.project_bookings
FOR ALL
USING (true);

CREATE POLICY "Users can view their project bookings"
ON public.project_bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_bookings.project_id
  )
);

-- RLS policies for candidate_notifications
CREATE POLICY "Admins can manage all notifications"
ON public.candidate_notifications
FOR ALL
USING (true);

CREATE POLICY "Candidates can view their own notifications"
ON public.candidate_notifications
FOR SELECT
USING (
  candidate_id IN (
    SELECT candidate_profiles.id
    FROM candidate_profiles
    WHERE candidate_profiles.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);

CREATE POLICY "Candidates can update their own notifications"
ON public.candidate_notifications
FOR UPDATE
USING (
  candidate_id IN (
    SELECT candidate_profiles.id
    FROM candidate_profiles
    WHERE candidate_profiles.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_project_bookings_updated_at
BEFORE UPDATE ON public.project_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_notifications_updated_at
BEFORE UPDATE ON public.candidate_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();