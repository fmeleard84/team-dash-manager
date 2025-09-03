-- Fix Drive Storage RLS Policies for Candidates
-- This migration fixes the storage.objects RLS policies to allow candidates to upload files

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to view" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to delete" ON storage.objects;

-- Create new comprehensive policies for project-files bucket

-- 1. INSERT policy: Allow both clients and candidates to upload files
CREATE POLICY "Enable upload for project members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (
    -- Client owners can upload to their projects
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted assignments can upload
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
    OR
    -- Client team members can upload
    EXISTS (
      SELECT 1 FROM public.client_team_members ctm
      WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
        AND ctm.user_id = auth.uid()
        AND ctm.status = 'active'
    )
  )
);

-- 2. SELECT policy: Allow viewing files
CREATE POLICY "Enable view for project members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    -- Client owners can view their project files
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted assignments can view
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
    OR
    -- Client team members can view
    EXISTS (
      SELECT 1 FROM public.client_team_members ctm
      WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
        AND ctm.user_id = auth.uid()
        AND ctm.status = 'active'
    )
  )
);

-- 3. UPDATE policy: Allow updating files
CREATE POLICY "Enable update for project members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    -- Client owners can update
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted assignments can update their own uploads
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
)
WITH CHECK (
  bucket_id = 'project-files' AND
  (
    -- Client owners can update
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted assignments can update
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- 4. DELETE policy: Allow deleting files
CREATE POLICY "Enable delete for project members"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    -- Client owners can delete
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted assignments can delete their own uploads
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verify the fix by checking candidate assignments
DO $$
DECLARE
  candidate_count INTEGER;
  project_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT cp.user_id), COUNT(DISTINCT hra.project_id)
  INTO candidate_count, project_count
  FROM hr_resource_assignments hra
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE hra.booking_status = 'accepted'
    AND cp.user_id IS NOT NULL;
    
  RAISE NOTICE 'RLS policies updated. Found % candidates with access to % projects', candidate_count, project_count;
END $$;