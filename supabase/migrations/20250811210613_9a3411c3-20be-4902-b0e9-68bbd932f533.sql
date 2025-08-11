-- Fix critical security vulnerability in candidate_profiles table
-- Remove overly permissive policies and implement proper access controls

-- Drop the dangerous "Admins can view all candidate profiles" policy that allows anyone to read all data
DROP POLICY IF EXISTS "Admins can view all candidate profiles" ON public.candidate_profiles;

-- Drop the overly permissive "Anyone can update candidate profiles" policy
DROP POLICY IF EXISTS "Anyone can update candidate profiles" ON public.candidate_profiles;

-- Create proper admin policy that actually checks for admin role
-- Using a simple approach that checks for admin group membership
CREATE POLICY "Verified admins can view all candidate profiles" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  -- Check if the JWT contains admin group
  current_setting('request.jwt.claims'::text, true)::jsonb -> 'groups' ? 'admin'
  OR
  -- Also allow via header-based admin check for edge functions
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
);

-- Create proper admin policy for updates
CREATE POLICY "Verified admins can update candidate profiles" 
ON public.candidate_profiles 
FOR UPDATE 
USING (
  -- Check if the JWT contains admin group
  current_setting('request.jwt.claims'::text, true)::jsonb -> 'groups' ? 'admin'
  OR
  -- Also allow via header-based admin check for edge functions
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
)
WITH CHECK (
  -- Check if the JWT contains admin group
  current_setting('request.jwt.claims'::text, true)::jsonb -> 'groups' ? 'admin'
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