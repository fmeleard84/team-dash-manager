-- Analyze RLS policies on storage.objects table
-- This script will help identify why candidates cannot upload files

-- 1. List all RLS policies on storage.objects
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
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- 2. Show the table structure
\d storage.objects

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 4. Check auth.uid() function availability
SELECT auth.uid() AS current_user_id;

-- 5. Check current user role
SELECT current_role;