-- Fix infinite recursion by creating security definer functions for both tables

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Candidates can view their own bookings" ON project_bookings;
DROP POLICY IF EXISTS "Owners select bookings" ON project_bookings;
DROP POLICY IF EXISTS "Resources can view assigned projects" ON projects;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.candidate_can_view_booking(booking_candidate_id UUID, candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.candidate_profiles cp
    WHERE cp.id = booking_candidate_id
    AND cp.email = candidate_email
  );
$$;

CREATE OR REPLACE FUNCTION public.owner_can_view_booking(booking_project_id UUID, owner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    WHERE p.id = booking_project_id
    AND p.owner_id = owner_user_id
  );
$$;

-- Create new policies for project_bookings using security definer functions
CREATE POLICY "Candidates can view their own bookings" 
ON project_bookings 
FOR SELECT 
USING (
  public.candidate_can_view_booking(
    project_bookings.candidate_id,
    COALESCE(
      (current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text,
      (current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text
    )
  )
);

CREATE POLICY "Owners can view project bookings" 
ON project_bookings 
FOR SELECT 
USING (
  public.owner_can_view_booking(
    project_bookings.project_id,
    auth.uid()
  )
);

-- Create new policy for projects
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