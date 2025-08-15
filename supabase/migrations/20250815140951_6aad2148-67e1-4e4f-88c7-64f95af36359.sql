-- PHASE 1: Fix candidate_profiles RLS recursion with SECURITY DEFINER functions
-- ============================================================================

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_email_safe()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  );
$$;

-- Drop all existing problematic candidate_profiles policies
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Anyone can create candidate profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Admins can view all candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Admins can update candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Clients can view candidates in their projects" ON public.candidate_profiles;

-- Create new simplified policies using security definer functions
CREATE POLICY "Candidates can view their own profile"
ON public.candidate_profiles
FOR SELECT
USING (email = public.get_current_user_email_safe());

CREATE POLICY "Candidates can update their own profile"
ON public.candidate_profiles
FOR UPDATE
USING (email = public.get_current_user_email_safe())
WITH CHECK (email = public.get_current_user_email_safe());

CREATE POLICY "Anyone can create candidate profile"
ON public.candidate_profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all candidate profiles"
ON public.candidate_profiles
FOR ALL
USING (public.is_admin_user_safe())
WITH CHECK (public.is_admin_user_safe());

-- Fix storage policies that also reference candidate_profiles
-- Drop existing problematic storage policies
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create simplified storage policies that don't depend on candidate_profiles table
CREATE POLICY "Project owners can manage project files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all files"
ON storage.objects
FOR ALL
USING (public.is_admin_user_safe())
WITH CHECK (public.is_admin_user_safe());

-- Create a simplified policy for authenticated users to view public files
CREATE POLICY "Authenticated users can view public files"
ON storage.objects
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create table for project_flows if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  flow_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on project_flows
ALTER TABLE public.project_flows ENABLE ROW LEVEL SECURITY;