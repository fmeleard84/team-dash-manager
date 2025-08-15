-- Phase 1: Clean up duplicate Kanban boards and fix RLS policies
-- Remove duplicate kanban boards (keep only the latest one per project)
DELETE FROM public.kanban_boards 
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id) id 
  FROM public.kanban_boards 
  ORDER BY project_id, created_at DESC
);

-- Phase 2: Correct Kanban column structure with proper order and colors
-- Update existing columns to have correct structure
UPDATE public.kanban_columns 
SET title = 'Setup', color = '#3B82F6', position = 0
WHERE title IN ('À faire', 'Todo', 'To Do', 'Setup') AND position = 0;

UPDATE public.kanban_columns 
SET title = 'À faire', color = '#6B7280', position = 1
WHERE position = 1;

UPDATE public.kanban_columns 
SET title = 'En cours', color = '#F59E0B', position = 2
WHERE position = 2;

UPDATE public.kanban_columns 
SET title = 'À contrôler', color = '#8B5CF6', position = 3
WHERE position = 3;

UPDATE public.kanban_columns 
SET title = 'Terminé', color = '#10B981', position = 4
WHERE position = 4;

-- Phase 3: Fix message threads RLS to prevent recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view message threads" ON public.message_threads;
DROP POLICY IF EXISTS "Project owners can manage message threads" ON public.message_threads;

-- Create safe RLS policies for message threads
CREATE POLICY "Project owners can manage message threads"
ON public.message_threads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = message_threads.project_id 
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = message_threads.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Team members can view message threads"
ON public.message_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_teams pt
    WHERE pt.project_id = message_threads.project_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
);

-- Phase 4: Add project status check to prevent premature resource creation
-- Update project orchestrator trigger to only work when project status changes to 'play'
CREATE OR REPLACE FUNCTION public.trigger_orchestrator_on_play()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes TO 'play' and was not already 'play'
  IF NEW.status = 'play' AND (OLD.status IS NULL OR OLD.status != 'play') THEN
    -- Call the orchestrator via edge function
    PERFORM net.http_post(
      url := 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/project-orchestrator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.jwt_token', true)
      ),
      body := jsonb_build_object(
        'action', 'setup-project',
        'projectId', NEW.id::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic project orchestration on status change
DROP TRIGGER IF EXISTS trigger_project_orchestrator ON public.projects;
CREATE TRIGGER trigger_project_orchestrator
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_orchestrator_on_play();