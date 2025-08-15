-- Fix infinite recursion in RLS policies by using security definer functions

-- Drop the problematic policy
DROP POLICY IF EXISTS "Resources can view assigned projects" ON projects;

-- Create a security definer function to check if candidate has access to a project
CREATE OR REPLACE FUNCTION public.candidate_has_project_access(project_id_param UUID, candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM project_bookings pb
    JOIN candidate_profiles cp ON cp.id = pb.candidate_id
    WHERE pb.project_id = project_id_param
    AND pb.status = 'accepted'
    AND cp.email = candidate_email
  );
$$;

-- Create the new policy using the security definer function
CREATE POLICY "Resources can view assigned projects" 
ON projects 
FOR SELECT 
USING (
  public.candidate_has_project_access(
    projects.id, 
    COALESCE(
      (current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text,
      (current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text
    )
  )
);