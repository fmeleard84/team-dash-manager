-- Fix RLS policies for project_flows to work properly with user authentication
DROP POLICY IF EXISTS "Users can view their project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Users can create project flows for their projects" ON public.project_flows;
DROP POLICY IF EXISTS "Users can update their project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Users can delete their project flows" ON public.project_flows;

-- Create comprehensive RLS policies that work with JWT authentication
CREATE POLICY "Users can view their project flows" ON public.project_flows
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);

CREATE POLICY "Users can create project flows for their projects" ON public.project_flows
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);

CREATE POLICY "Users can update their project flows" ON public.project_flows
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);

CREATE POLICY "Users can delete their project flows" ON public.project_flows
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  )
);