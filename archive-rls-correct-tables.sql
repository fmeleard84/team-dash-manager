-- Policies RLS pour empêcher les modifications sur les projets archivés
-- =====================================================================
-- Version corrigée avec les vraies tables de la base de données

-- 1. Policies pour hr_resource_assignments
-- Empêcher toute modification si le projet est archivé

DROP POLICY IF EXISTS "No updates on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No inserts on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No deletes on archived projects" ON hr_resource_assignments;

CREATE POLICY "No updates on archived projects"
  ON hr_resource_assignments
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = hr_resource_assignments.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No inserts on archived projects"
  ON hr_resource_assignments
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No deletes on archived projects"
  ON hr_resource_assignments
  FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = hr_resource_assignments.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 2. Policies pour project_events
DROP POLICY IF EXISTS "No event updates on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event inserts on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event deletes on archived projects" ON project_events;

CREATE POLICY "No event updates on archived projects"
  ON project_events
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_events.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No event inserts on archived projects"
  ON project_events
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No event deletes on archived projects"
  ON project_events
  FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_events.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 3. Policies pour project_bookings (Kanban)
DROP POLICY IF EXISTS "No booking updates on archived projects" ON project_bookings;
DROP POLICY IF EXISTS "No booking inserts on archived projects" ON project_bookings;
DROP POLICY IF EXISTS "No booking deletes on archived projects" ON project_bookings;

CREATE POLICY "No booking updates on archived projects"
  ON project_bookings
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_bookings.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No booking inserts on archived projects"
  ON project_bookings
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No booking deletes on archived projects"
  ON project_bookings
  FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_bookings.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 4. Policies pour messages
DROP POLICY IF EXISTS "No message updates on archived projects" ON messages;
DROP POLICY IF EXISTS "No message inserts on archived projects" ON messages;

CREATE POLICY "No message updates on archived projects"
  ON messages
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = messages.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No message inserts on archived projects"
  ON messages
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 5. Policies pour time_entries
DROP POLICY IF EXISTS "No time tracking on archived projects" ON time_entries;
DROP POLICY IF EXISTS "No time updates on archived projects" ON time_entries;

CREATE POLICY "No time tracking on archived projects"
  ON time_entries
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No time updates on archived projects"
  ON time_entries
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = time_entries.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 6. Policies pour active_time_tracking
DROP POLICY IF EXISTS "No active tracking on archived projects" ON active_time_tracking;
DROP POLICY IF EXISTS "No active tracking updates on archived projects" ON active_time_tracking;

CREATE POLICY "No active tracking on archived projects"
  ON active_time_tracking
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No active tracking updates on archived projects"
  ON active_time_tracking
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = active_time_tracking.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- Afficher le statut
SELECT 'Policies RLS pour projets archivés créées avec succès' as status;