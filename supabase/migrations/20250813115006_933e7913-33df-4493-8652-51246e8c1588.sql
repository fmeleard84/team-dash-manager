-- Fix RLS policies for kanban-files storage bucket
-- Update policies to allow proper file access

DROP POLICY IF EXISTS "Owners can insert files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can select files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete files" ON storage.objects;

-- Create comprehensive RLS policies for kanban-files bucket
CREATE POLICY "Users can upload files to kanban-files bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kanban-files' AND
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE kc.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view files from kanban-files bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kanban-files' AND
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE kc.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update files in kanban-files bucket"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kanban-files' AND
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE kc.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files from kanban-files bucket"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kanban-files' AND
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE kc.id::text = (storage.foldername(name))[1]
    AND p.owner_id = auth.uid()
  )
);