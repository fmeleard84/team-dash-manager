
-- Fix RLS policy scope: allow anon role (we rely on apikey + Keycloak headers)
-- 1) Drop the wrongly-scoped policy
DROP POLICY IF EXISTS "Project owners can manage resource assignments (JWT fallback)" ON public.hr_resource_assignments;

-- 2) Recreate with correct scope (TO public)
CREATE POLICY "Project owners can manage resource assignments (JWT fallback)"
ON public.hr_resource_assignments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND (
        -- Primary: Check Keycloak headers
        p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
        OR
        -- Fallback: Check JWT claims (if ever present)
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
        -- Fallback: Check JWT claims (if ever present)
        p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
      )
  )
);
