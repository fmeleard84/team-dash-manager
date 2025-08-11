-- Fix critical security vulnerability in project_flows table
-- The current policy allows ANYONE to perform all operations on project workflows

-- Drop the dangerous policy that allows public access to all project flows
DROP POLICY IF EXISTS "Allow all operations on project flows" ON public.project_flows;

-- Create secure policy for project owners to view their project flows
CREATE POLICY "Project owners can view their project flows" 
ON public.project_flows 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND (
      p.keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
      OR 
      p.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
    )
  )
);

-- Create policy for assigned candidates to view project flows (read-only access to flows they're assigned to)
CREATE POLICY "Assigned candidates can view project flows" 
ON public.project_flows 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_project_assignments cpa
    JOIN public.candidate_profiles cp ON cp.id = cpa.candidate_id
    WHERE cpa.project_id = project_flows.project_id
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR
      cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);

-- Create policy for project owners to insert project flows
CREATE POLICY "Project owners can create project flows" 
ON public.project_flows 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND (
      p.keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
      OR 
      p.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
    )
  )
);

-- Create policy for project owners to update their project flows
CREATE POLICY "Project owners can update their project flows" 
ON public.project_flows 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND (
      p.keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
      OR 
      p.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND (
      p.keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
      OR 
      p.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
    )
  )
);

-- Create policy for project owners to delete their project flows
CREATE POLICY "Project owners can delete their project flows" 
ON public.project_flows 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND (
      p.keycloak_user_id = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-sub'::text)
      OR 
      p.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'sub'::text)
    )
  )
);

-- Create policy for admins to manage all project flows (for administrative purposes)
CREATE POLICY "Admins can manage all project flows" 
ON public.project_flows 
FOR ALL 
USING (
  -- Check if user has admin role in JWT groups
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  -- Allow via edge functions with proper admin access header
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
)
WITH CHECK (
  -- Same conditions for the check
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
);