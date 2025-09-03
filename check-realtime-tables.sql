-- 1. VÉRIFIER QUELLES TABLES SONT ACTUELLEMENT EN REALTIME
-- Exécutez cette requête pour voir toutes les tables qui ont le realtime activé
SELECT 
    schemaname as schema,
    tablename as table_name,
    pubname as publication
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
ORDER BY tablename;

-- 2. VÉRIFIER LES TABLES CRITIQUES QUI DEVRAIENT ÊTRE EN REALTIME
-- Cette requête montre quelles tables critiques existent dans votre base
WITH critical_tables AS (
    SELECT unnest(ARRAY[
        'hr_resource_assignments',
        'candidate_notifications',
        'resource_transitions',
        'project_access_rights',
        'resource_change_history',
        'projects',
        'project_members',
        'project_files',
        'kanban_cards',
        'kanban_columns',
        'messages',
        'message_read_status',
        'candidate_profiles',
        'candidate_event_notifications',
        'notifications',
        'task_ratings'
    ]) AS table_name
),
existing_tables AS (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
),
realtime_tables AS (
    SELECT tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public'
)
SELECT 
    ct.table_name,
    CASE 
        WHEN et.tablename IS NOT NULL THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as table_status,
    CASE 
        WHEN rt.tablename IS NOT NULL THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as realtime_status
FROM critical_tables ct
LEFT JOIN existing_tables et ON ct.table_name = et.tablename
LEFT JOIN realtime_tables rt ON ct.table_name = rt.tablename
ORDER BY 
    CASE WHEN rt.tablename IS NULL THEN 0 ELSE 1 END,
    ct.table_name;