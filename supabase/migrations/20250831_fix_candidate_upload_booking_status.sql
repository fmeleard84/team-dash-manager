-- Fix RLS policies on storage.objects to support both 'accepted' and 'booké' booking_status
-- This fixes the issue where candidates with booking_status = 'booké' cannot upload files

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "project_members_upload" ON storage.objects;
DROP POLICY IF EXISTS "project_members_view" ON storage.objects;
DROP POLICY IF EXISTS "project_members_update" ON storage.objects;
DROP POLICY IF EXISTS "project_members_delete" ON storage.objects;

-- Create corrected INSERT policy that supports BOTH 'accepted' AND 'booké'
CREATE POLICY "project_members_upload_fixed"
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
    -- Candidates with accepted OR booké booking (FIXED)
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')  -- ✅ FIXED: Now supports both values
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

-- Create corrected SELECT policy
CREATE POLICY "project_members_view_fixed"
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
    -- Candidates with accepted OR booké booking (FIXED)
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')  -- ✅ FIXED: Now supports both values
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

-- Create corrected UPDATE policy
CREATE POLICY "project_members_update_fixed"
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
        AND hra.booking_status IN ('accepted', 'booké')  -- ✅ FIXED: Now supports both values
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
        AND hra.booking_status IN ('accepted', 'booké')  -- ✅ FIXED: Now supports both values
    )
  )
);

-- Create corrected DELETE policy
CREATE POLICY "project_members_delete_fixed"
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
        AND hra.booking_status IN ('accepted', 'booké')  -- ✅ FIXED: Now supports both values
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;