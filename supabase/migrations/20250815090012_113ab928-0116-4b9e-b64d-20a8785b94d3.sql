-- Allow candidates to delete events they created or participate in
CREATE POLICY "Candidates can delete their own events or events they attend" 
ON public.project_events 
FOR DELETE 
USING (
  -- User is the creator of the event
  created_by = auth.uid() 
  OR 
  -- User is a candidate assigned to the project of this event
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