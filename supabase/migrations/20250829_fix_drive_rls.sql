-- Fix Drive Storage RLS Policies for Candidates
-- This migration fixes the storage.objects RLS policies to allow candidates to upload files

-- Drop all existing policies on storage.objects for clean slate
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

-- Create unified policies for all project members

-- 1. INSERT policy: Allow upload for project members
CREATE POLICY "project_members_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (
    -- Client owners
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted booking
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
    OR
    -- Client team members
    EXISTS (
      SELECT 1 FROM client_team_members ctm
      WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
        AND ctm.user_id = auth.uid()
        AND ctm.status = 'active'
    )
  )
);

-- 2. SELECT policy: Allow view for project members
CREATE POLICY "project_members_view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    -- Client owners
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted booking
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
    OR
    -- Client team members
    EXISTS (
      SELECT 1 FROM client_team_members ctm
      WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
        AND ctm.user_id = auth.uid()
        AND ctm.status = 'active'
    )
  )
);

-- 3. UPDATE policy: Allow update for project members
CREATE POLICY "project_members_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
)
WITH CHECK (
  bucket_id = 'project-files' AND
  (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- 4. DELETE policy: Allow delete for project members
CREATE POLICY "project_members_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status = 'accepted'
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;