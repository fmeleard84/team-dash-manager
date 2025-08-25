-- Enable RLS on project_files if not already enabled
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Candidates can view files for their assigned projects" ON project_files;
DROP POLICY IF EXISTS "Clients can view files for their projects" ON project_files;
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON project_files;

-- Policy for candidates to see files for projects they have accepted assignments on
CREATE POLICY "Candidates can view files for their assigned projects" ON project_files
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON (
        hra.profile_id = cp.profile_id AND 
        hra.seniority = cp.seniority AND
        cp.keycloak_user_id = auth.jwt() ->> 'sub'
      )
      WHERE hra.project_id = project_files.project_id
      AND hra.booking_status = 'accepted'
    )
  );

-- Policy for clients to see files for their own projects
CREATE POLICY "Clients can view files for their projects" ON project_files
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_profiles cp ON (
        p.client_id = cp.id AND
        cp.keycloak_user_id = auth.jwt() ->> 'sub'
      )
      WHERE p.id = project_files.project_id
    )
  );

-- Policy for authenticated users to upload files (with additional business logic in app)
CREATE POLICY "Authenticated users can upload project files" ON project_files
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Policy for file owners to update/delete their files
CREATE POLICY "Users can manage their uploaded files" ON project_files
  FOR ALL 
  USING (
    auth.role() = 'authenticated' AND
    uploaded_by = auth.jwt() ->> 'sub'
  );

-- Ensure storage bucket policies allow file access
-- Note: Storage policies are separate and may need to be configured in the Supabase dashboard