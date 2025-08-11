-- Fix critical security vulnerability in admin_users table
-- The current policy allows ANYONE to read all admin credentials

-- Drop the dangerous policy that allows public access to admin credentials
DROP POLICY IF EXISTS "Admin users can view their own data" ON public.admin_users;

-- Create secure policy that only allows admins to view their own data
CREATE POLICY "Admins can view their own profile only" 
ON public.admin_users 
FOR SELECT 
USING (
  -- Only allow admin to see their own data via Keycloak user ID
  keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
  OR
  -- Allow via Keycloak headers for edge functions
  keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
);

-- Create policy for admin user management (INSERT) - only allow via edge functions with admin access
CREATE POLICY "Secure admin user creation" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (
  -- Only allow via edge functions with proper admin access header
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
  OR
  -- Allow if user has admin role in JWT groups
  current_setting('request.jwt.claims'::text, true)::jsonb -> 'groups' ? 'admin'
);

-- Create policy for admin user updates - only allow admins to update their own data
CREATE POLICY "Admins can update their own profile only" 
ON public.admin_users 
FOR UPDATE 
USING (
  -- Only allow admin to update their own data via Keycloak user ID
  keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
  OR
  -- Allow via Keycloak headers for edge functions
  keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
  OR
  -- Allow via edge functions with proper admin access header
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
)
WITH CHECK (
  -- Same conditions for the check
  keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
  OR
  keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
  OR
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
);

-- Create policy for admin user deletion - only super admins
CREATE POLICY "Super admins can delete admin users" 
ON public.admin_users 
FOR DELETE 
USING (
  -- Only allow via edge functions with proper admin access header
  (current_setting('request.headers'::text, true)::jsonb ->> 'x-admin-access') = 'true'
  OR
  -- Allow if user has admin role in JWT groups
  current_setting('request.jwt.claims'::text, true)::jsonb -> 'groups' ? 'admin'
);