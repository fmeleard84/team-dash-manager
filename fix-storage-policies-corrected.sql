-- CORRECTION FINALE des politiques RLS pour Storage (VERSION CORRIGÉE)
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
    CASE 
        WHEN cmd = 'INSERT' THEN '📝 UPLOAD'
        WHEN cmd = 'SELECT' THEN '👁️ VIEW'
        WHEN cmd = 'UPDATE' THEN '✏️ UPDATE'
        WHEN cmd = 'DELETE' THEN '🗑️ DELETE'
    END as action,
    'Fixed to accept both accepted and booké' as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 5. Verify that the fix works for our problematic candidate
WITH test_candidate AS (
    SELECT 
        cp.first_name,
        cp.last_name,
        cp.user_id,
        hra.project_id,
        hra.booking_status,
        CASE 
            WHEN hra.booking_status IN ('accepted', 'booké') THEN '✅ Should work now'
            ELSE '❌ Will not work'
        END as upload_status
    FROM candidate_profiles cp
    JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
    WHERE cp.first_name = 'CDP FM 2708'
        AND hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
)
SELECT * FROM test_candidate;