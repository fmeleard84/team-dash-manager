-- Improve RLS policies for storage objects to allow proper file access

-- Drop existing policies for storage.objects related to kanban-files
DROP POLICY IF EXISTS "Users can upload files to kanban-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in kanban-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in kanban-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files in kanban-files bucket" ON storage.objects;

-- Create comprehensive RLS policies for kanban-files storage bucket
CREATE POLICY "Allow authenticated users to upload to kanban-files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kanban-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to view kanban-files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kanban-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to update kanban-files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kanban-files' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'kanban-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to delete kanban-files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kanban-files' 
  AND auth.uid() IS NOT NULL
);