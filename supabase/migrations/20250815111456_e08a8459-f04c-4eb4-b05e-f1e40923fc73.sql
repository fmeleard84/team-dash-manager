-- Fix RLS policies for project_files to allow candidates to view files from their assigned projects

-- Remove existing restrictive policy if it exists
DROP POLICY IF EXISTS "Team members can view project files" ON project_files;

-- Add policy for candidates to view files from their assigned projects
CREATE POLICY "Candidates can view files from assigned projects"
ON project_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM project_teams pt
    JOIN candidate_profiles cp ON cp.id = pt.member_id
    WHERE pt.project_id = project_files.project_id
    AND pt.member_type = 'resource'
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);