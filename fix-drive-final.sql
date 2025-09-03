-- Fix Drive Storage RLS - Final Version
-- This fixes both the path issue (project/ vs projects/) and RLS policies

-- First, drop ALL existing policies on storage.objects
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
DROP POLICY IF EXISTS "Enable upload for project members" ON storage.objects;
DROP POLICY IF EXISTS "Enable view for project members" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for project members" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for project members" ON storage.objects;
DROP POLICY IF EXISTS "project_members_upload" ON storage.objects;
DROP POLICY IF EXISTS "project_members_view" ON storage.objects;
DROP POLICY IF EXISTS "project_members_update" ON storage.objects;
DROP POLICY IF EXISTS "project_members_delete" ON storage.objects;
DROP POLICY IF EXISTS "drive_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "drive_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "drive_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "drive_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to upload v2" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to view v2" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to update v2" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to delete v2" ON storage.objects;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create unified policies that work with the correct path format (projects/{id}/)

-- 1. INSERT/UPLOAD Policy
CREATE POLICY "enable_storage_upload_for_project_members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (
    -- Path must start with 'projects/'
    name LIKE 'projects/%' AND
    (
      -- Client owners can upload to their projects
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = SPLIT_PART(name, '/', 2)
          AND p.owner_id = auth.uid()
      )
      OR
      -- Candidates with accepted booking can upload
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
  )
);

-- 2. SELECT/VIEW Policy
CREATE POLICY "enable_storage_view_for_project_members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    -- Path must start with 'projects/'
    name LIKE 'projects/%' AND
    (
      -- Client owners can view
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = SPLIT_PART(name, '/', 2)
          AND p.owner_id = auth.uid()
      )
      OR
      -- Candidates with accepted booking can view
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
  )
);

-- 3. UPDATE Policy
CREATE POLICY "enable_storage_update_for_project_members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
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
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- 4. DELETE Policy
CREATE POLICY "enable_storage_delete_for_project_members"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- Verify the setup
DO $$
DECLARE
  policy_count INTEGER;
  candidate_count INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';
  
  -- Count candidates with access
  SELECT COUNT(DISTINCT cp.user_id) INTO candidate_count
  FROM hr_resource_assignments hra
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE hra.booking_status = 'accepted' AND cp.user_id IS NOT NULL;
  
  RAISE NOTICE 'Successfully created % RLS policies for storage.objects', policy_count;
  RAISE NOTICE 'Found % candidates with project access', candidate_count;
END $$;