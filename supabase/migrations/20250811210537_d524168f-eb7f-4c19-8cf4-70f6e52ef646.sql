-- Fix critical security vulnerability in client_profiles table
-- Drop the overly permissive admin policy
DROP POLICY IF EXISTS "Admins can view all client profiles" ON public.client_profiles;

-- Create proper admin policy that checks for actual admin role via Keycloak headers
CREATE POLICY "Admins can view all client profiles via Keycloak" 
ON public.client_profiles 
FOR SELECT 
USING (
  -- Check if user has admin role in Keycloak groups
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-groups')::text[] && ARRAY['admin']
  OR
  -- Fallback to JWT claims for admin group check
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'groups')::text[] && ARRAY['admin']
);

-- Create proper admin policy for managing client profiles
CREATE POLICY "Admins can manage all client profiles via Keycloak" 
ON public.client_profiles 
FOR ALL
USING (
  -- Check if user has admin role in Keycloak groups
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-groups')::text[] && ARRAY['admin']
  OR
  -- Fallback to JWT claims for admin group check
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'groups')::text[] && ARRAY['admin']
)
WITH CHECK (
  -- Same check for inserts/updates
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-groups')::text[] && ARRAY['admin']
  OR
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'groups')::text[] && ARRAY['admin']
);