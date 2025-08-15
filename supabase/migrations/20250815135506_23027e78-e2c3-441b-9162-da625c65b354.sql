-- Create project_flows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  flow_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_flows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_flows
CREATE POLICY "Project owners can manage their flow data"
ON public.project_flows
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = project_flows.project_id 
  AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = project_flows.project_id 
  AND p.owner_id = auth.uid()
));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_flows_project_id ON public.project_flows(project_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_project_flows_timestamp
  BEFORE UPDATE ON public.project_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();