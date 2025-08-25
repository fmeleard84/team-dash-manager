-- Créer le bucket pour les fichiers Kanban
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kanban-files', 
  'kanban-files', 
  true, 
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
);

-- Créer les politiques RLS pour le bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kanban-files');

CREATE POLICY "Allow authenticated users to view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kanban-files');

CREATE POLICY "Allow authenticated users to update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kanban-files');

CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kanban-files');