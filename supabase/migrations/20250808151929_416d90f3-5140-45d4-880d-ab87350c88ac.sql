-- Add fallback RLS policy that also checks JWT claims as backup
CREATE POLICY "Project owners can manage resource assignments (JWT fallback)"
ON public.hr_resource_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND (
        -- Primary: Check Keycloak headers
        p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
        OR
        -- Fallback: Check JWT claims
        p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND (
        -- Primary: Check Keycloak headers
        p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
        OR
        -- Fallback: Check JWT claims
        p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
      )
  )
);

-- Drop the old policy since we have the new one with fallback
DROP POLICY IF EXISTS "Project owners can manage resource assignments" ON public.hr_resource_assignments;