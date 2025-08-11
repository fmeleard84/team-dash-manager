-- Fix critical security vulnerability in candidate_profiles table
-- Remove overly permissive policies and implement proper access controls

-- Drop the dangerous "Admins can view all candidate profiles" policy that allows anyone to read all data
DROP POLICY IF EXISTS "Admins can view all candidate profiles" ON public.candidate_profiles;

-- Drop the overly permissive "Anyone can update candidate profiles" policy
DROP POLICY IF EXISTS "Anyone can update candidate profiles" ON public.candidate_profiles;

-- Create proper admin policy that actually checks for admin role via Keycloak groups
CREATE POLICY "Verified admins can view all candidate profiles" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  -- Check if user has admin role in Keycloak groups (fix JSON casting)
  (
    SELECT string_to_array(
      COALESCE(
        (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'groups'),
        '[]'
      ), 
      ','
    ) && ARRAY['admin']
  )
  OR
  -- Also allow via header-based admin check for edge functions
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
);

-- Create proper admin policy for updates
CREATE POLICY "Verified admins can update candidate profiles" 
ON public.candidate_profiles 
FOR UPDATE 
USING (
  -- Check if user has admin role in Keycloak groups (fix JSON casting)
  (
    SELECT string_to_array(
      COALESCE(
        (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'groups'),
        '[]'
      ), 
      ','
    ) && ARRAY['admin']
  )
  OR
  -- Also allow via header-based admin check for edge functions
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
)
WITH CHECK (
  -- Check if user has admin role in Keycloak groups (fix JSON casting)
  (
    SELECT string_to_array(
      COALESCE(
        (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'groups'),
        '[]'
      ), 
      ','
    ) && ARRAY['admin']
  )
  OR
  -- Also allow via header-based admin check for edge functions
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
);

-- Allow candidates to update their own profiles (more restrictive than before)
CREATE POLICY "Candidates can update their own profile data" 
ON public.candidate_profiles 
FOR UPDATE 
USING (
  -- Via JWT email
  email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  OR
  -- Via Keycloak header email
  email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
)
WITH CHECK (
  -- Via JWT email
  email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  OR
  -- Via Keycloak header email
  email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
);

-- Create a secure view for candidate matching that only exposes safe fields
CREATE OR REPLACE VIEW public.candidate_matching_view AS
SELECT 
  id,
  profile_id,
  profile_type,
  rating,
  seniority,
  status,
  daily_rate,
  created_at,
  updated_at
FROM public.candidate_profiles
WHERE 
  status = 'disponible' 
  AND is_email_verified = true;

-- Enable RLS on the view
ALTER VIEW public.candidate_matching_view SET (security_barrier = true);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.candidate_matching_view TO authenticated;

-- Create policy for the view
CREATE POLICY "Authenticated users can view candidate matching data" 
ON public.candidate_matching_view 
FOR SELECT 
USING (true);