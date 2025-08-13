-- Clean up redundant RLS policies for storage that may be causing conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Keep only the specific kanban-files policies
-- These should already exist from previous migrations, but ensure they're correct

-- Ensure kanban-files bucket allows public access for signed URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'kanban-files';