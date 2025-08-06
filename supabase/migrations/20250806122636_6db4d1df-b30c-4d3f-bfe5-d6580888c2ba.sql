-- Debug: Create a function to check current JWT claims
CREATE OR REPLACE FUNCTION public.debug_jwt_claims()
RETURNS jsonb AS $$
BEGIN
  RETURN current_setting('request.jwt.claims'::text, true)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update projects table RLS policies to be more permissive for debugging
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Create more permissive policies using authenticated users
CREATE POLICY "Authenticated users can create projects" 
ON projects 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view projects" 
ON projects 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update projects" 
ON projects 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete projects" 
ON projects 
FOR DELETE 
TO authenticated
USING (true);

-- Similarly update project_flows policies
DROP POLICY IF EXISTS "Users can create project flows for their projects" ON project_flows;
DROP POLICY IF EXISTS "Users can view their project flows" ON project_flows;
DROP POLICY IF EXISTS "Users can update their project flows" ON project_flows;
DROP POLICY IF EXISTS "Users can delete their project flows" ON project_flows;

CREATE POLICY "Authenticated users can create project flows" 
ON project_flows 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view project flows" 
ON project_flows 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update project flows" 
ON project_flows 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete project flows" 
ON project_flows 
FOR DELETE 
TO authenticated
USING (true);