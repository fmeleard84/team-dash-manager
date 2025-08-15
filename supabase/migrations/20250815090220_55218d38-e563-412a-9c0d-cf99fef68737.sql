-- Fix the security warning by setting search_path
CREATE OR REPLACE FUNCTION public.can_user_delete_event(event_id uuid, event_project_id uuid, event_created_by uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the creator
  IF event_created_by = auth.uid() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a team member of the project
  IF EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = event_project_id
    AND pt.member_id = auth.uid()
    AND pt.member_type = 'resource'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is listed as an attendee via candidate profile email
  IF EXISTS (
    SELECT 1 
    FROM public.project_event_attendees pea
    JOIN public.candidate_profiles cp ON cp.email = pea.email
    WHERE pea.event_id = event_id
    AND cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';