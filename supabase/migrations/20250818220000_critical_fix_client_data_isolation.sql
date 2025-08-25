-- CRITICAL SECURITY FIX: Ensure clients can only see their own data
-- This migration fixes a major security issue where clients could see each other's projects

-- 1. Fix projects table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Enable all operations for project owners" ON projects;
DROP POLICY IF EXISTS "Admins have full access to projects" ON projects;
DROP POLICY IF EXISTS "Project visibility" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;

-- CRITICAL: Only owners can see their projects
CREATE POLICY "Clients can only view their own projects" ON projects
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Clients can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Clients can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Clients can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- 2. Fix kanban_columns policies
DROP POLICY IF EXISTS "Enable read access for all users" ON kanban_columns;
DROP POLICY IF EXISTS "Enable all operations for project members" ON kanban_columns;
DROP POLICY IF EXISTS "Allow access to kanban columns for project participants" ON kanban_columns;

-- Only allow access to kanban columns of owned projects
CREATE POLICY "Access kanban columns of owned projects only" ON kanban_columns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = kanban_columns.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 3. Fix kanban_cards policies
DROP POLICY IF EXISTS "Enable read access for all users" ON kanban_cards;
DROP POLICY IF EXISTS "Enable all operations for project members" ON kanban_cards;
DROP POLICY IF EXISTS "Allow access to kanban cards for project participants" ON kanban_cards;

-- Only allow access to kanban cards of owned projects
CREATE POLICY "Access kanban cards of owned projects only" ON kanban_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kanban_columns kc
      JOIN projects p ON p.id = kc.project_id
      WHERE kc.id = kanban_cards.column_id 
      AND p.owner_id = auth.uid()
    )
  );

-- 4. Fix message_threads policies
DROP POLICY IF EXISTS "Enable read access for all users" ON message_threads;
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Allow access to message threads for project participants" ON message_threads;

-- Only allow access to message threads of owned projects
CREATE POLICY "Access message threads of owned projects only" ON message_threads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = message_threads.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 5. Fix messages policies
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Allow access to messages for thread participants" ON messages;

-- Only allow access to messages of owned projects
CREATE POLICY "Access messages of owned projects only" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      JOIN projects p ON p.id = mt.project_id
      WHERE mt.id = messages.thread_id 
      AND p.owner_id = auth.uid()
    )
  );

-- 6. Fix project_files policies
DROP POLICY IF EXISTS "Enable read access for all users" ON project_files;
DROP POLICY IF EXISTS "Allow access to project files for project participants" ON project_files;

-- Only allow access to files of owned projects
CREATE POLICY "Access files of owned projects only" ON project_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 7. Fix hr_resource_assignments policies  
DROP POLICY IF EXISTS "Enable read access for all users" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Allow access to resource assignments for project participants" ON hr_resource_assignments;

-- Only project owners can see assignments for their projects
CREATE POLICY "Access resource assignments of owned projects only" ON hr_resource_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = hr_resource_assignments.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Log this critical security fix
INSERT INTO audit_logs (action, details, created_at) 
VALUES (
  'CRITICAL_SECURITY_FIX',
  'Fixed client data isolation - clients can now only see their own projects',
  NOW()
) ON CONFLICT DO NOTHING;