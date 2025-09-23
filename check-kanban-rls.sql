-- 1. Vérifier la structure de la table kanban_files
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'kanban_files'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes sur uploaded_by
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'kanban_files'
    AND kcu.column_name = 'uploaded_by';

-- 3. Vérifier les politiques RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'kanban_files';

-- 4. Vérifier si RLS est activé sur la table
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'kanban_files';