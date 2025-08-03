-- Create table to link HR projects with Planka projects
CREATE TABLE public.planka_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  planka_project_id TEXT NOT NULL,
  planka_board_id TEXT NOT NULL,
  planka_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.planka_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for planka_projects
CREATE POLICY "Users can view their planka projects" 
ON public.planka_projects 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = planka_projects.project_id
));

CREATE POLICY "Users can create planka projects for their projects" 
ON public.planka_projects 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = planka_projects.project_id
));

CREATE POLICY "Users can update their planka projects" 
ON public.planka_projects 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = planka_projects.project_id
));

CREATE POLICY "Users can delete their planka projects" 
ON public.planka_projects 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = planka_projects.project_id
));