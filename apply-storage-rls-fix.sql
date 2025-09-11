-- Fix Storage RLS Policies for project-files bucket
-- ==================================================

-- First, let's check what policies exist
DO $$
BEGIN
    RAISE NOTICE 'Checking existing storage policies...';
END $$;

-- Drop all existing policies on storage.objects for project-files
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;  
DROP POLICY IF EXISTS "Users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view project files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update project files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_3" ON storage.objects;

-- Create new permissive policies for authenticated users
-- These policies allow any authenticated user to manage files in project-files bucket

-- 1. INSERT Policy - Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-files'
);

-- 2. SELECT Policy - Allow authenticated users to view files  
CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-files'
);

-- 3. UPDATE Policy - Allow authenticated users to update files
CREATE POLICY "Authenticated users can update project files"  
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'project-files'
)
WITH CHECK (
    bucket_id = 'project-files'
);

-- 4. DELETE Policy - Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-files'
);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%project files%'
ORDER BY policyname;