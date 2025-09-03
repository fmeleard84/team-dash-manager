-- Policies RLS pour empêcher les modifications sur les projets archivés
-- =====================================================================

-- 1. Policies pour hr_resource_assignments
-- Empêcher toute modification si le projet est archivé

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "No updates on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No inserts on archived projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "No deletes on archived projects" ON hr_resource_assignments;

-- Créer les nouvelles policies
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
-- Supprimer les policies existantes
DROP POLICY IF EXISTS "No event updates on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event inserts on archived projects" ON project_events;
DROP POLICY IF EXISTS "No event deletes on archived projects" ON project_events;

-- Créer les nouvelles policies
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

-- 3. Policies pour project_kanban_cards
-- Supprimer les policies existantes
DROP POLICY IF EXISTS "No kanban updates on archived projects" ON project_kanban_cards;
DROP POLICY IF EXISTS "No kanban inserts on archived projects" ON project_kanban_cards;
DROP POLICY IF EXISTS "No kanban deletes on archived projects" ON project_kanban_cards;

-- Créer les nouvelles policies
CREATE POLICY "No kanban updates on archived projects"
  ON project_kanban_cards
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_kanban_cards.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No kanban inserts on archived projects"
  ON project_kanban_cards
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No kanban deletes on archived projects"
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
-- Supprimer les policies existantes
DROP POLICY IF EXISTS "No message updates on archived projects" ON project_messages;
DROP POLICY IF EXISTS "No message inserts on archived projects" ON project_messages;

-- Créer les nouvelles policies
CREATE POLICY "No message updates on archived projects"
  ON project_messages
  FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_messages.project_id
      AND p.archived_at IS NOT NULL
    )
  );

CREATE POLICY "No message inserts on archived projects"
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
-- Supprimer les policies existantes
DROP POLICY IF EXISTS "No time tracking on archived projects" ON time_entries;
DROP POLICY IF EXISTS "No time updates on archived projects" ON time_entries;

-- Créer les nouvelles policies
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

-- 6. Fonction pour vérifier si une opération storage est autorisée
CREATE OR REPLACE FUNCTION check_storage_archive_permission(path_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  project_id_from_path UUID;
BEGIN
  -- Extraire le project_id du path (format: projects/{project_id}/...)
  IF path_param LIKE 'projects/%' THEN
    -- Extraire l'UUID entre les slashes
    BEGIN
      project_id_from_path := (split_part(path_param, '/', 2))::UUID;
      
      -- Vérifier si le projet est archivé
      IF EXISTS (
        SELECT 1 FROM projects 
        WHERE id = project_id_from_path 
        AND archived_at IS NOT NULL
      ) THEN
        RETURN FALSE; -- Opération non autorisée
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Si erreur de conversion UUID, autoriser (ce n'est pas un project path valide)
      RETURN TRUE;
    END;
  END IF;
  
  RETURN TRUE; -- Opération autorisée
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Afficher le statut
SELECT 'Policies RLS pour projets archivés créées avec succès' as status;