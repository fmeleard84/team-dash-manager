-- Policies RLS pour empêcher les modifications sur les projets archivés
-- =====================================================================

-- 1. Policies pour hr_resource_assignments
-- Empêcher toute modification si le projet est archivé
CREATE OR REPLACE POLICY "No updates on archived projects"
  ON hr_resource_assignments
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = hr_resource_assignments.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No inserts on archived projects"
  ON hr_resource_assignments
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No deletes on archived projects"
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
-- Empêcher toute modification si le projet est archivé
CREATE OR REPLACE POLICY "No event updates on archived projects"
  ON project_events
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_events.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No event inserts on archived projects"
  ON project_events
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No event deletes on archived projects"
  ON project_events
  FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_events.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 3. Policies pour project_kanban_cards
-- Empêcher toute modification si le projet est archivé
CREATE OR REPLACE POLICY "No kanban updates on archived projects"
  ON project_kanban_cards
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_kanban_cards.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No kanban inserts on archived projects"
  ON project_kanban_cards
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No kanban deletes on archived projects"
  ON project_kanban_cards
  FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_kanban_cards.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 4. Policies pour project_messages
-- Empêcher toute modification si le projet est archivé
CREATE OR REPLACE POLICY "No message updates on archived projects"
  ON project_messages
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_messages.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No message inserts on archived projects"
  ON project_messages
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 5. Policies pour time_entries
-- Empêcher toute modification si le projet est archivé
CREATE OR REPLACE POLICY "No time tracking on archived projects"
  ON time_entries
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE OR REPLACE POLICY "No time updates on archived projects"
  ON time_entries
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = time_entries.project_id
      AND p.archived_at IS NOT NULL
    )
  );

-- 6. Fonction pour vérifier si une opération storage est autorisée
CREATE OR REPLACE FUNCTION check_storage_archive_permission(path_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  project_id_from_path UUID;
BEGIN
  -- Extraire le project_id du path (format: projects/{project_id}/...)
  IF path_param LIKE 'projects/%' THEN
    project_id_from_path := split_part(split_part(path_param, '/', 2), '/', 1)::UUID;
    
    -- Vérifier si le projet est archivé
    IF EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_id_from_path 
      AND archived_at IS NOT NULL
    ) THEN
      RETURN FALSE; -- Opération non autorisée
    END IF;
  END IF;
  
  RETURN TRUE; -- Opération autorisée
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Appliquer les restrictions aux bucket storage
-- Note: Les policies de storage doivent être appliquées via le dashboard Supabase
-- ou via des triggers personnalisés

-- Afficher le statut
SELECT 'Policies RLS pour projets archivés créées avec succès' as status;