-- Fix RLS policy for candidate_profiles to properly handle client vs candidate access
-- The 406 error suggests there's an issue with the email query permission for clients

-- Update the RLS policy to be more specific about who can query candidate profiles
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Verified admins can view all candidate profiles" ON public.candidate_profiles;

-- Recreate policies with better permission handling
CREATE POLICY "Candidates can view their own profile" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  -- Candidate can see their own profile via email match
  email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text) 
  OR email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
);

CREATE POLICY "Verified admins can view all candidate profiles" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  -- Admins can see all profiles
  (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text) 
  OR (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text)
);

-- Add policy for clients to see candidate profiles in their projects
CREATE POLICY "Clients can view candidates in their projects" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  -- Clients can see candidates that are booked in their projects
  EXISTS (
    SELECT 1 
    FROM public.project_bookings pb
    JOIN public.projects p ON p.id = pb.project_id
    WHERE pb.candidate_id = candidate_profiles.id
    AND p.owner_id = auth.uid()
    AND pb.status = 'accepted'
  )
);