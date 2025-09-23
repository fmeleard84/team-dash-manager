-- Vérifier les colonnes de la table kanban_files
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'kanban_files'
ORDER BY ordinal_position;