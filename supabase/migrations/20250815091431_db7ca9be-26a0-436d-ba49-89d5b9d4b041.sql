-- Fix infinite recursion in project_events RLS policies
-- Drop the problematic policy first
DROP POLICY IF EXISTS "Candidates can view their project events" ON public.project_events;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_project_team_member(project_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = project_id_param
    AND pt.member_id = user_id_param
    AND pt.member_type = 'resource'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_attendee(event_id_param uuid, user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_event_attendees pea
    JOIN public.candidate_profiles cp ON cp.email = pea.email
    WHERE pea.event_id = event_id_param
    AND cp.email = user_email
  );
$$;

-- Recreate the policy using the security definer functions
CREATE POLICY "Candidates can view their project events" 
ON public.project_events 
FOR SELECT 
USING (
  -- User is a team member of the project
  public.is_project_team_member(project_id, auth.uid())
  OR
  -- User is listed as an attendee of this event via candidate profile email
  public.is_event_attendee(id, ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text))
);