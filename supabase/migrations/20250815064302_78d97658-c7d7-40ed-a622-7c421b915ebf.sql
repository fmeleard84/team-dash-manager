-- Revert to proper RLS policy for project_bookings
DROP POLICY IF EXISTS "Candidates can view their own bookings" ON project_bookings;

-- Create proper policy that checks candidate ownership
CREATE POLICY "Candidates can view their own bookings" 
ON project_bookings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM candidate_profiles cp
    WHERE cp.id = project_bookings.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);