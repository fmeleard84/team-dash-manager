-- Fix trigger and create correct Kanban columns structure
DROP TRIGGER IF EXISTS update_project_flows_updated_at ON public.project_flows;

-- Create project_flows table for React Flow data
DROP TABLE IF EXISTS public.project_flows CASCADE;
CREATE TABLE public.project_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nodes jsonb DEFAULT '[]'::jsonb,
  edges jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_flows
ALTER TABLE public.project_flows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_flows
CREATE POLICY "Owners can manage project flows" ON public.project_flows
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND p.owner_id = auth.uid()
  )
);

-- Add trigger for project_flows updated_at
CREATE TRIGGER update_project_flows_updated_at
  BEFORE UPDATE ON public.project_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();