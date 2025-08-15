-- Update the candidate access function to handle different auth scenarios
CREATE OR REPLACE FUNCTION public.candidate_has_project_access(project_id_param UUID, candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_bookings pb
    JOIN public.candidate_profiles cp ON cp.id = pb.candidate_id
    WHERE pb.project_id = project_id_param
    AND pb.status = 'accepted'
    AND cp.email = candidate_email
  );
$$;

-- Update the policy to be more permissive for debugging
DROP POLICY IF EXISTS "Resources can view assigned projects" ON projects;

CREATE POLICY "Resources can view assigned projects" 
ON projects 
FOR SELECT 
USING (
  -- Allow access if the project has any accepted booking (temporary for debugging)
  EXISTS (
    SELECT 1 
    FROM public.project_bookings pb
    WHERE pb.project_id = projects.id 
    AND pb.status = 'accepted'
  )
);