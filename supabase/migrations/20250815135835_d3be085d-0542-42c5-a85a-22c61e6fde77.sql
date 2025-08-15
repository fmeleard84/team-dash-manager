-- Fix infinite recursion in candidate_profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;

-- Create a secure function to get current user email without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_email_safe()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  );
$$;

-- Recreate policies using the safe function and direct email comparison
CREATE POLICY "Candidates can update their own profile"
ON public.candidate_profiles
FOR UPDATE
USING (
  email = COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  )
)
WITH CHECK (
  email = COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  )
);

CREATE POLICY "Candidates can view their own profile"
ON public.candidate_profiles
FOR SELECT
USING (
  email = COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  )
);

-- Also fix the is_admin_user function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin_user_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  );
$$;

-- Update admin policies to use the safe function
DROP POLICY IF EXISTS "Admins can update candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Admins can view all candidate profiles" ON public.candidate_profiles;

CREATE POLICY "Admins can update candidate profiles"
ON public.candidate_profiles
FOR UPDATE
USING (
  COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  )
)
WITH CHECK (
  COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  )
);

CREATE POLICY "Admins can view all candidate profiles"
ON public.candidate_profiles
FOR SELECT
USING (
  COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  )
);