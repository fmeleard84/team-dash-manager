-- Update RLS policies for projects table to work with apikey authentication
-- Since we're using Option A (pragmatic approach), we allow operations with apikey
-- and handle authorization in the application layer

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Create new policies that allow authenticated operations with apikey
-- The application layer will ensure keycloak_user_id is properly set

CREATE POLICY "Authenticated users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (keycloak_user_id IS NOT NULL);

CREATE POLICY "Authenticated users can view projects" 
ON public.projects 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update projects" 
ON public.projects 
FOR UPDATE 
USING (true)
WITH CHECK (keycloak_user_id IS NOT NULL);

CREATE POLICY "Authenticated users can delete projects" 
ON public.projects 
FOR DELETE 
USING (true);