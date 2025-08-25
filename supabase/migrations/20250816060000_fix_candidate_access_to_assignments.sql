-- Add policy to allow candidates to view resource assignments in "recherche" status
-- This is necessary for the CandidateMissionRequests component to work

-- First, let's add a policy that allows authenticated users to view assignments looking for candidates
CREATE POLICY "Candidates can view available assignments"
ON public.hr_resource_assignments
FOR SELECT
USING (
  -- Allow viewing assignments that are actively searching for candidates
  booking_status IN ('recherche', 'draft')
  AND auth.uid() IS NOT NULL  -- User must be authenticated
);

-- Also ensure candidates can see related project information for assignments they can view
-- This policy should already exist but let's ensure it's correct
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Public read access for projects'
  ) THEN
    CREATE POLICY "Public read access for projects"
    ON public.projects
    FOR SELECT
    USING (true);
  END IF;
END
$$;

-- Ensure hr_profiles are readable by authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'hr_profiles' 
    AND policyname = 'Profiles are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.hr_profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- Ensure hr_categories are readable by authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'hr_categories' 
    AND policyname = 'Categories are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Categories are viewable by authenticated users"
    ON public.hr_categories
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;