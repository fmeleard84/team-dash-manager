-- Create storage bucket for kanban files
INSERT INTO storage.buckets (id, name, public) VALUES ('kanban-files', 'kanban-files', false);

-- Create RLS policies for kanban files
CREATE POLICY "Users can view files from their project kanban boards" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kanban-files' AND 
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE p.owner_id = auth.uid()
    AND name LIKE kc.id || '/%'
  )
);

CREATE POLICY "Users can upload files to their project kanban cards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kanban-files' AND 
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id  
    JOIN projects p ON p.id = kb.project_id
    WHERE p.owner_id = auth.uid()
    AND name LIKE kc.id || '/%'
  )
);

CREATE POLICY "Users can update files in their project kanban cards" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'kanban-files' AND 
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE p.owner_id = auth.uid()
    AND name LIKE kc.id || '/%'
  )
);

CREATE POLICY "Users can delete files from their project kanban cards" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'kanban-files' AND 
  EXISTS (
    SELECT 1 FROM kanban_cards kc
    JOIN kanban_boards kb ON kb.id = kc.board_id
    JOIN projects p ON p.id = kb.project_id
    WHERE p.owner_id = auth.uid()
    AND name LIKE kc.id || '/%'
  )
);