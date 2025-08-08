-- Debug current RLS policies for hr_resource_assignments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'hr_resource_assignments';

-- Check if the project exists and ownership for debugging
SELECT 
  p.id, 
  p.title, 
  p.keycloak_user_id,
  current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub' as current_keycloak_sub
FROM projects p 
WHERE p.id = 'e7def756-f903-4b79-94a2-f91ff6a8a1d1'
LIMIT 1;

-- Update RLS policies to ensure proper ownership checking
DROP POLICY IF EXISTS "Owners can insert resource assignments" ON public.hr_resource_assignments;
DROP POLICY IF EXISTS "Owners can update resource assignments" ON public.hr_resource_assignments;
DROP POLICY IF EXISTS "Owners can delete resource assignments" ON public.hr_resource_assignments;
DROP POLICY IF EXISTS "Owners can access their resource assignments" ON public.hr_resource_assignments;

-- Create comprehensive policies with proper debugging
CREATE POLICY "Project owners can manage resource assignments"
ON public.hr_resource_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  )
);