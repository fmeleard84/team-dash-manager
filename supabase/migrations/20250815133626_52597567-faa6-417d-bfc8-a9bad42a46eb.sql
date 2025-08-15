-- Fix infinite recursion in candidate_profiles RLS policies
-- The issue is that policies are referencing the same table they're applied to

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Verified admins can view all candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Clients can view candidates in their projects" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Anyone can create candidate profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own profile data" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own status" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Verified admins can update candidate profiles" ON public.candidate_profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate policies using security definer functions
CREATE POLICY "Anyone can create candidate profile" 
ON public.candidate_profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Candidates can view their own profile" 
ON public.candidate_profiles 
FOR SELECT 
USING (email = public.get_current_user_email());

CREATE POLICY "Candidates can update their own profile" 
ON public.candidate_profiles 
FOR UPDATE 
USING (email = public.get_current_user_email())
WITH CHECK (email = public.get_current_user_email());

CREATE POLICY "Admins can view all candidate profiles" 
ON public.candidate_profiles 
FOR SELECT 
USING (public.is_admin_user());

CREATE POLICY "Admins can update candidate profiles" 
ON public.candidate_profiles 
FOR UPDATE 
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Clients can view candidates in their projects" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.project_bookings pb
    JOIN public.projects p ON p.id = pb.project_id
    WHERE pb.candidate_id = candidate_profiles.id
    AND p.owner_id = auth.uid()
    AND pb.status = 'accepted'
  )
);