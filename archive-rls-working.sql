-- Policies RLS pour empêcher les modifications sur les projets archivés
-- =====================================================================
-- Version testée et fonctionnelle avec les vraies tables

-- 1. Policies pour hr_resource_assignments
DROP POLICY IF EXISTS "No updates on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No inserts on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No deletes on archived projects" ON hr_resource_assignments;

CREATE POLICY "No updates on archived projects"
  ON hr_resource_assignments
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No inserts on archived projects"
  ON hr_resource_assignments
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No deletes on archived projects"
  ON hr_resource_assignments
  FOR DELETE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- 2. Policies pour project_events
DROP POLICY IF EXISTS "No event updates on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event inserts on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event deletes on archived projects" ON project_events;

CREATE POLICY "No event updates on archived projects"
  ON project_events
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No event inserts on archived projects"
  ON project_events
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No event deletes on archived projects"
  ON project_events
  FOR DELETE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- 3. Policies pour project_bookings (Kanban)
DROP POLICY IF EXISTS "No booking updates on archived projects" ON project_bookings;
DROP POLICY IF EXISTS "No booking inserts on archived projects" ON project_bookings;
DROP POLICY IF EXISTS "No booking deletes on archived projects" ON project_bookings;

CREATE POLICY "No booking updates on archived projects"
  ON project_bookings
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No booking inserts on archived projects"
  ON project_bookings
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No booking deletes on archived projects"
  ON project_bookings
  FOR DELETE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- 4. Policies pour message_threads
DROP POLICY IF EXISTS "No thread updates on archived projects" ON message_threads;
DROP POLICY IF EXISTS "No thread inserts on archived projects" ON message_threads;

CREATE POLICY "No thread updates on archived projects"
  ON message_threads
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No thread inserts on archived projects"
  ON message_threads
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- 5. Policies pour messages (liés aux threads)
DROP POLICY IF EXISTS "No message updates on archived threads" ON messages;
DROP POLICY IF EXISTS "No message inserts on archived threads" ON messages;

CREATE POLICY "No message updates on archived threads"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      JOIN projects p ON p.id = mt.project_id
      WHERE mt.id = messages.thread_id
      AND p.archived_at IS NULL
    )
  );

CREATE POLICY "No message inserts on archived threads"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_threads mt
      JOIN projects p ON p.id = mt.project_id
      WHERE mt.id = thread_id
      AND p.archived_at IS NULL
    )
  );

-- 6. Policies pour time_tracking_sessions (pas time_entries)
DROP POLICY IF EXISTS "No time tracking on archived projects" ON time_tracking_sessions;
DROP POLICY IF EXISTS "No time updates on archived projects" ON time_tracking_sessions;

CREATE POLICY "No time tracking on archived projects"
  ON time_tracking_sessions
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No time updates on archived projects"
  ON time_tracking_sessions
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- 7. Policies pour active_time_tracking
DROP POLICY IF EXISTS "No active tracking on archived projects" ON active_time_tracking;
DROP POLICY IF EXISTS "No active tracking updates on archived projects" ON active_time_tracking;

CREATE POLICY "No active tracking on archived projects"
  ON active_time_tracking
  FOR INSERT
  WITH CHECK (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

CREATE POLICY "No active tracking updates on archived projects"
  ON active_time_tracking
  FOR UPDATE
  USING (
    (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
  );

-- Afficher le statut
SELECT 'Policies RLS pour projets archivés créées avec succès' as status;