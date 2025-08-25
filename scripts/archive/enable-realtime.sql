-- Activer le realtime pour les tables nécessaires
-- Ce script active la réplication en temps réel pour permettre la synchronisation instantanée entre client et candidat

-- 1. Activer le realtime pour la table projects
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- 2. Activer le realtime pour la table hr_resource_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE hr_resource_assignments;

-- 3. Activer le realtime pour la table candidate_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE candidate_notifications;

-- 4. Activer le realtime pour la table project_bookings (si elle existe)
ALTER PUBLICATION supabase_realtime ADD TABLE project_bookings;

-- 5. Activer le realtime pour la table kanban_cards
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_cards;

-- 6. Activer le realtime pour la table kanban_columns
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_columns;

-- 7. Activer le realtime pour la table messages (si elle existe)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 8. Activer le realtime pour la table project_files
ALTER PUBLICATION supabase_realtime ADD TABLE project_files;

-- Note: Après avoir exécuté ce script, vous devez:
-- 1. Aller dans le tableau de bord Supabase
-- 2. Aller dans Database > Replication
-- 3. Vérifier que les tables sont bien activées
-- 4. Si besoin, activer manuellement les tables qui ne le sont pas