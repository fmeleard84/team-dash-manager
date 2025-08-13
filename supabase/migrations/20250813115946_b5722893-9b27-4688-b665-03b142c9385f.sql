-- Make kanban-files bucket public to fix upload issues
UPDATE storage.buckets 
SET public = true 
WHERE id = 'kanban-files';