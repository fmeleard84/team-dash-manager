-- Make project-files bucket public for file access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-files';