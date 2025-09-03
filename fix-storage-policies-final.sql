-- CORRECTION FINALE des politiques RLS pour Storage
-- Le problème: les politiques actuelles ne vérifient que booking_status = 'accepted'
-- mais certains candidats ont booking_status = 'booké'

-- 1. Supprimer TOUTES les anciennes politiques
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 2. Créer des nouvelles politiques qui acceptent BOTH 'accepted' AND 'booké'

-- INSERT: Upload files
CREATE POLICY "storage_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    -- Client owners can upload
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted OR booké status can upload
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')  -- FIX HERE
    )
    OR
    -- Client team members can upload
    EXISTS (
      SELECT 1 FROM client_team_members ctm
      WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
        AND ctm.user_id = auth.uid()
        AND ctm.status = 'active'
    )
  )
);

-- SELECT: View files
CREATE POLICY "storage_view_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
  (
    -- Client owners
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
        AND p.owner_id = auth.uid()
    )
    OR
    -- Candidates with accepted OR booké status
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
        AND cp.user_id = auth.uid()
        AND hra.booking_status IN ('accepted', 'booké')  -- FIX HERE
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

-- UPDATE: Update files
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
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
        AND hra.booking_status IN ('accepted', 'booké')  -- FIX HERE
    )
  )
)
WITH CHECK (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
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
        AND hra.booking_status IN ('accepted', 'booké')  -- FIX HERE
    )
  )
);

-- DELETE: Delete files
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  name LIKE 'projects/%' AND
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
        AND hra.booking_status IN ('accepted', 'booké')  -- FIX HERE
    )
  )
);

-- 3. Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Verify the new policies
SELECT 
    policyname,
    cmd,
    substring(with_check::text, 1, 50) || '...' as check_sample
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;