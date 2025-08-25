-- ================================================
-- SUPPRESSION COMPLETE DES PROJETS DE TEST
-- ================================================
-- Projets à supprimer: 'Mon projet perso', 'Test 2', 'test6', 'test 6'
-- 
-- ATTENTION: Cette opération est IRREVERSIBLE !
-- Assurez-vous de faire une sauvegarde avant d'exécuter ce script
-- ================================================

BEGIN;

-- 1. Supprimer les assignments de ressources
DELETE FROM hr_resource_assignments
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 2. Supprimer les cartes kanban
DELETE FROM kanban_cards
WHERE board_id IN (
  SELECT id FROM kanban_boards 
  WHERE project_id IN (
    SELECT id FROM projects 
    WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
  )
);

-- 3. Supprimer les colonnes kanban
DELETE FROM kanban_columns
WHERE board_id IN (
  SELECT id FROM kanban_boards 
  WHERE project_id IN (
    SELECT id FROM projects 
    WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
  )
);

-- 4. Supprimer les boards kanban
DELETE FROM kanban_boards
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 5. Supprimer les événements
DELETE FROM project_events
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 6. Supprimer les notifications candidats
DELETE FROM candidate_notifications
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 7. Supprimer les notifications d'événements candidats
DELETE FROM candidate_event_notifications
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 8. Supprimer les messages
DELETE FROM messages
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 9. Supprimer les fichiers de projet
DELETE FROM project_files
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 10. Supprimer les équipes de projet
DELETE FROM project_teams
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 11. Finalement, supprimer les projets eux-mêmes
DELETE FROM projects 
WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6');

-- Vérifier le résultat
SELECT 
  'Suppression terminée' as status,
  COUNT(*) as projets_restants 
FROM projects 
WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6');

COMMIT;

-- Si vous voulez annuler, remplacez COMMIT par ROLLBACK