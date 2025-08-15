-- Create event notifications table for candidates
CREATE TABLE IF NOT EXISTS public.candidate_event_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL,
  event_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  location text,
  video_url text,
  status text NOT NULL DEFAULT 'unread'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, event_id)
);

-- Enable RLS
ALTER TABLE public.candidate_event_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for candidate event notifications
CREATE POLICY "Candidates can view their own event notifications" 
ON public.candidate_event_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.candidate_profiles cp
    WHERE cp.id = candidate_event_notifications.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text) 
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);

CREATE POLICY "Candidates can update their own event notifications" 
ON public.candidate_event_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.candidate_profiles cp
    WHERE cp.id = candidate_event_notifications.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text) 
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);

-- Allow admins to manage event notifications
CREATE POLICY "Admins can manage all event notifications" 
ON public.candidate_event_notifications 
FOR ALL 
USING (
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text 
  OR 
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text
);

-- Create trigger to automatically create event notifications when attendees are added
CREATE OR REPLACE FUNCTION public.create_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Find candidate profile by email and create notification
  INSERT INTO public.candidate_event_notifications (
    candidate_id,
    event_id,
    project_id,
    title,
    description,
    event_date,
    location,
    video_url
  )
  SELECT 
    cp.id,
    pe.id,
    pe.project_id,
    'Nouvel événement: ' || pe.title,
    pe.description,
    pe.start_at,
    pe.location,
    pe.video_url
  FROM public.candidate_profiles cp
  JOIN public.project_events pe ON pe.id = NEW.event_id
  WHERE cp.email = NEW.email
  ON CONFLICT (candidate_id, event_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    event_date = EXCLUDED.event_date,
    location = EXCLUDED.location,
    video_url = EXCLUDED.video_url,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger on project_event_attendees
CREATE TRIGGER trigger_create_event_notifications
  AFTER INSERT ON public.project_event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_notifications();

-- Add update timestamp trigger
CREATE TRIGGER update_candidate_event_notifications_updated_at
  BEFORE UPDATE ON public.candidate_event_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();