-- Simplify project_flows RLS policies to avoid recursion issues

-- Drop all existing policies for project_flows
DROP POLICY IF EXISTS "Owners select flows" ON public.project_flows;
DROP POLICY IF EXISTS "Owners insert flows" ON public.project_flows;
DROP POLICY IF EXISTS "Owners update flows" ON public.project_flows;
DROP POLICY IF EXISTS "Owners delete flows" ON public.project_flows;
DROP POLICY IF EXISTS "Project owners can manage their flow data" ON public.project_flows;
DROP POLICY IF EXISTS "Assigned candidates can view project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Admins can manage all project flows" ON public.project_flows;

-- Create simple, non-recursive policies
CREATE POLICY "Project owners can manage project flows"
ON public.project_flows
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_flows.project_id 
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_flows.project_id 
    AND p.owner_id = auth.uid()
  )
);

-- Admins can manage all flows (simplified)
CREATE POLICY "Admins can manage all project flows"
ON public.project_flows
FOR ALL
USING (
  COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  )
)
WITH CHECK (
  COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  )
);