-- Diagnostic complet du problème realtime

-- 1. Vérifier que la table est bien dans la publication
SELECT 
    'Publication Status' as check_type,
    EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'hr_resource_assignments'
    ) as result;

-- 2. Vérifier les politiques RLS sur la table
SELECT 
    'RLS Status' as check_type,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'hr_resource_assignments';

-- 3. Lister toutes les politiques RLS sur hr_resource_assignments
SELECT 
    polname as policy_name,
    polcmd as command,
    polpermissive as permissive,
    pg_get_expr(polqual, polrelid) as qual,
    pg_get_expr(polwithcheck, polrelid) as with_check,
    (SELECT rolname FROM pg_roles WHERE oid = polroles[1]) as role
FROM pg_policy
WHERE polrelid = 'hr_resource_assignments'::regclass
ORDER BY polname;

-- 4. Vérifier si le realtime peut lire la table (politiques SELECT)
SELECT 
    polname as policy_name,
    pg_get_expr(polqual, polrelid) as policy_condition
FROM pg_policy
WHERE polrelid = 'hr_resource_assignments'::regclass
    AND polcmd = 's'  -- SELECT policies
ORDER BY polname;

-- 5. Vérifier le rôle supabase_realtime_admin
SELECT 
    'Realtime Admin Role Exists' as check_type,
    EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'supabase_realtime_admin'
    ) as result;

-- 6. Vérifier les permissions du rôle realtime
SELECT 
    'Table Permissions' as permission_type,
    has_table_privilege('supabase_realtime_admin', 'hr_resource_assignments', 'SELECT') as has_select,
    has_table_privilege('authenticated', 'hr_resource_assignments', 'SELECT') as auth_has_select,
    has_table_privilege('anon', 'hr_resource_assignments', 'SELECT') as anon_has_select;

-- 7. Vérifier toutes les tables avec realtime activé
SELECT 
    tablename,
    COUNT(*) as count
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 8. Test de visibilité des données
-- Essayons de voir combien de lignes sont visibles
SELECT 
    'Total Rows' as count_type,
    COUNT(*) as count
FROM hr_resource_assignments
UNION ALL
SELECT 
    'Rows with project_id' as count_type,
    COUNT(*) as count
FROM hr_resource_assignments
WHERE project_id IS NOT NULL;