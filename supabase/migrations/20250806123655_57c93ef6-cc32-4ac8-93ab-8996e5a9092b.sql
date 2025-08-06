-- Add keycloak_user_id column to client_profiles if not exists
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS keycloak_user_id text;

-- Drop existing RLS policies for client_profiles
DROP POLICY IF EXISTS "Clients can view their own profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Clients can update their own profile" ON public.client_profiles;

-- Create new RLS policies based on keycloak_user_id
CREATE POLICY "Clients can view their own profile" 
ON public.client_profiles 
FOR SELECT 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles 
FOR UPDATE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))
WITH CHECK (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

-- Update projects RLS policies to be more specific (they were too permissive)
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))
WITH CHECK (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));