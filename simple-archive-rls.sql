-- Policies RLS simplifiées pour projets archivés
-- ================================================
-- Cette approche modifie les policies existantes ou les crée si elles n'existent pas

-- Pour tester d'abord, vous pouvez vérifier les policies existantes avec :
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Option 1: Si vous voulez juste ajouter des restrictions aux policies existantes
-- Vous pouvez les modifier manuellement dans Supabase Dashboard

-- Option 2: Créer de nouvelles policies avec des noms uniques
-- (évite les conflits avec les policies existantes)

-- Policies pour hr_resource_assignments
CREATE POLICY "block_archived_project_updates_hr" ON hr_resource_assignments
FOR UPDATE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_inserts_hr" ON hr_resource_assignments
FOR INSERT WITH CHECK (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_deletes_hr" ON hr_resource_assignments
FOR DELETE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

-- Policies pour project_events
CREATE POLICY "block_archived_project_updates_events" ON project_events
FOR UPDATE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_inserts_events" ON project_events
FOR INSERT WITH CHECK (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_deletes_events" ON project_events
FOR DELETE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

-- Policies pour project_kanban_cards
CREATE POLICY "block_archived_project_updates_kanban" ON project_kanban_cards
FOR UPDATE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_inserts_kanban" ON project_kanban_cards
FOR INSERT WITH CHECK (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_deletes_kanban" ON project_kanban_cards
FOR DELETE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

-- Policies pour project_messages  
CREATE POLICY "block_archived_project_inserts_messages" ON project_messages
FOR INSERT WITH CHECK (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

-- Policies pour time_entries
CREATE POLICY "block_archived_project_inserts_time" ON time_entries
FOR INSERT WITH CHECK (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

CREATE POLICY "block_archived_project_updates_time" ON time_entries
FOR UPDATE USING (
  (SELECT archived_at FROM projects WHERE id = project_id) IS NULL
);

SELECT 'Policies créées avec succès' as status;