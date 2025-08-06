-- Add keycloak_user_id column to projects table
ALTER TABLE projects ADD COLUMN keycloak_user_id text;

-- Migrate existing data (assuming user_id contains email)
UPDATE projects SET keycloak_user_id = user_id WHERE user_id IS NOT NULL;

-- Drop existing RLS policies for project_flows
DROP POLICY IF EXISTS "Users can create project flows for their projects" ON project_flows;
DROP POLICY IF EXISTS "Users can view their project flows" ON project_flows;
DROP POLICY IF EXISTS "Users can update their project flows" ON project_flows;
DROP POLICY IF EXISTS "Users can delete their project flows" ON project_flows;

-- Create new RLS policies for project_flows using keycloak_user_id and sub claim
CREATE POLICY "Users can create project flows for their projects" 
ON project_flows 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
  )
);

CREATE POLICY "Users can view their project flows" 
ON project_flows 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
  )
);

CREATE POLICY "Users can update their project flows" 
ON project_flows 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
  )
);

CREATE POLICY "Users can delete their project flows" 
ON project_flows 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_flows.project_id 
    AND projects.keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
  )
);

-- Update projects table RLS policies to use keycloak_user_id
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

CREATE POLICY "Users can create their own projects" 
ON projects 
FOR INSERT 
WITH CHECK (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can view their own projects" 
ON projects 
FOR SELECT 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can update their own projects" 
ON projects 
FOR UPDATE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can delete their own projects" 
ON projects 
FOR DELETE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));