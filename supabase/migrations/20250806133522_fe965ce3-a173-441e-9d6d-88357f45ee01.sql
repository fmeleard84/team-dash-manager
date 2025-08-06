-- Update RLS policies for project_flows table to work with apikey authentication
-- Since we're using Option A (pragmatic approach), we allow operations with apikey
-- and handle authorization in the application layer

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Authenticated users can view project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Authenticated users can update project flows" ON public.project_flows;
DROP POLICY IF EXISTS "Authenticated users can delete project flows" ON public.project_flows;

-- Create new policies that allow authenticated operations with apikey
-- Authorization will be handled in the application layer

CREATE POLICY "Allow all operations on project flows" 
ON public.project_flows 
FOR ALL 
USING (true)
WITH CHECK (true);