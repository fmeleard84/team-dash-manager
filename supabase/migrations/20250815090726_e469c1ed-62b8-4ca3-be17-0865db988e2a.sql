-- Allow candidates to view events they're involved with
CREATE POLICY "Candidates can view their project events" 
ON public.project_events 
FOR SELECT 
USING (
  -- User is a team member of the project
  EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = project_events.project_id
    AND pt.member_id = auth.uid()
    AND pt.member_type = 'resource'
  )
  OR
  -- User is listed as an attendee of this event via candidate profile email
  EXISTS (
    SELECT 1 
    FROM public.project_event_attendees pea
    JOIN public.candidate_profiles cp ON cp.email = pea.email
    WHERE pea.event_id = project_events.id
    AND cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  )
);