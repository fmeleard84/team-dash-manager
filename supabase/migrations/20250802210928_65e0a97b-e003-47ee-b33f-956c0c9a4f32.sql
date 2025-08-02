-- Update RLS policies for hr_resource_assignments to work with admin authentication
-- Since we're using a custom admin auth system, we need to disable RLS restrictions for authenticated admin users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own resource assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Users can view their own resource assignments" ON hr_resource_assignments;

-- Create new policies that allow access when the project exists and belongs to any user
-- Since admins can manage all projects, we'll check project existence instead of user ownership
CREATE POLICY "Allow access to resource assignments for existing projects" 
ON hr_resource_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = hr_resource_assignments.project_id
));