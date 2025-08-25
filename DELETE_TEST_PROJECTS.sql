-- Supprimer les projets de test et leurs dépendances
-- ATTENTION: Cette opération est irréversible

-- 1. D'abord supprimer les assignments liés à ces projets
DELETE FROM hr_resource_assignments
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 2. Supprimer les kanban boards associés
DELETE FROM kanban_cards
WHERE board_id IN (
  SELECT id FROM kanban_boards 
  WHERE project_id IN (
    SELECT id FROM projects 
    WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
  )
);

DELETE FROM kanban_columns
WHERE board_id IN (
  SELECT id FROM kanban_boards 
  WHERE project_id IN (
    SELECT id FROM projects 
    WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
  )
);

DELETE FROM kanban_boards
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 3. Supprimer les events associés
DELETE FROM events
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 4. Supprimer les messages associés
DELETE FROM messages
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 5. Supprimer les project_files associés
DELETE FROM project_files
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6')
);

-- 6. Finalement supprimer les projets eux-mêmes
DELETE FROM projects 
WHERE title IN ('Mon projet perso', 'Test 2', 'test6', 'test 6');

-- Vérifier le résultat
SELECT 'Projets supprimés avec succès' as message;