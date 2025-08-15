-- Update RLS policy for candidates to access projects via project_bookings
DROP POLICY IF EXISTS "Resources can view assigned projects" ON projects;

CREATE POLICY "Resources can view assigned projects" 
ON projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM project_bookings pb
    JOIN candidate_profiles cp ON cp.id = pb.candidate_id
    WHERE pb.project_id = projects.id 
    AND pb.status = 'accepted'
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);