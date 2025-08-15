-- Fix the security warning by setting search_path
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