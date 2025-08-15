-- Create project_files table to track file metadata
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_uploaded_by ON project_files(uploaded_by);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_files table
-- Project owners can manage their project files
CREATE POLICY "Project owners can manage their project files"
ON public.project_files
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = project_files.project_id 
  AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = project_files.project_id 
  AND p.owner_id = auth.uid()
));

-- Team members can view project files
CREATE POLICY "Team members can view project files"
ON public.project_files
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.project_id = project_files.project_id
  AND pt.member_id = auth.uid()
));

-- Candidates can view files from their assigned projects
CREATE POLICY "Candidates can view files from assigned projects"
ON public.project_files
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  JOIN public.candidate_profiles cp ON cp.email = pt.email
  WHERE pt.project_id = project_files.project_id
  AND pt.member_type = 'resource'
  AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
       OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
));

-- Admins can manage all project files
CREATE POLICY "Admins can manage all project files"
ON public.project_files
FOR ALL
USING ((((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text) 
       OR (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text));

-- Add updated_at trigger
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update storage policies for project-files bucket
-- Policy for team members to view files
CREATE POLICY "Team members can view project files in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files' 
  AND (
    -- Project owners can see their files
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = 'project'
      AND (storage.foldername(name))[2] = p.id::text
    )
    OR
    -- Team members can see files from their projects
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      JOIN public.projects p ON p.id = pt.project_id
      WHERE pt.member_id = auth.uid()
      AND (storage.foldername(name))[1] = 'project'
      AND (storage.foldername(name))[2] = p.id::text
    )
    OR
    -- Candidates can see files from assigned projects
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      JOIN public.candidate_profiles cp ON cp.email = pt.email
      JOIN public.projects p ON p.id = pt.project_id
      WHERE pt.member_type = 'resource'
      AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
           OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
      AND (storage.foldername(name))[1] = 'project'
      AND (storage.foldername(name))[2] = p.id::text
    )
  )
);

-- Policy for project owners to upload files
CREATE POLICY "Project owners can upload files to their projects"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'project'
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[2] = p.id::text
  )
);

-- Policy for project owners to manage their files
CREATE POLICY "Project owners can manage their project files in storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'project'
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.owner_id = auth.uid()
    AND (storage.foldername(name))[2] = p.id::text
  )
);