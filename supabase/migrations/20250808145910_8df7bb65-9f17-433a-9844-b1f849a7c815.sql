-- Ensure RLS is enabled on hr_resource_assignments
ALTER TABLE public.hr_resource_assignments ENABLE ROW LEVEL SECURITY;

-- Allow project owners to INSERT resource assignments for their own projects
CREATE POLICY "Owners can insert resource assignments"
ON public.hr_resource_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  )
);

-- Allow project owners to UPDATE resource assignments for their own projects
CREATE POLICY "Owners can update resource assignments"
ON public.hr_resource_assignments
FOR UPDATE
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

-- Allow project owners to DELETE resource assignments for their own projects
CREATE POLICY "Owners can delete resource assignments"
ON public.hr_resource_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = hr_resource_assignments.project_id
      AND p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  )
);
