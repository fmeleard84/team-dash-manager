-- Add policy for project owners to view their project teams
CREATE POLICY "Project owners can view their project teams" 
ON public.project_teams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.projects p
    WHERE p.id = project_teams.project_id 
    AND p.owner_id = auth.uid()
  )
);