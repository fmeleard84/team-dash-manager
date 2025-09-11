-- Vérifier les politiques RLS existantes pour le storage bucket 'project-files'
-- ===============================================================

-- 1. Vérifier si le bucket existe et ses paramètres
SELECT 
    name as bucket_name,
    public as is_public,
    created_at,
    updated_at,
    allowed_mime_types,
    file_size_limit
FROM storage.buckets 
WHERE name = 'project-files';

-- 2. Lister TOUTES les politiques sur storage.objects
SELECT 
    schemaname,
    tablename,
    policyname as policy_name,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- 3. Lister spécifiquement les politiques liées au bucket 'project-files'
SELECT 
    policyname as policy_name,
    cmd as operation,
    roles,
    qual as using_clause,
    with_check as check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%project-files%' 
    OR with_check::text LIKE '%project-files%'
    OR policyname LIKE '%project%'
  );

-- 4. Vérifier les permissions pour un utilisateur authentifié (simulation)
SELECT 
    'INSERT' as operation,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'INSERT'
        AND 'authenticated' = ANY(roles)
    ) as has_policy
UNION ALL
SELECT 
    'SELECT' as operation,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'SELECT'
        AND 'authenticated' = ANY(roles)
    ) as has_policy
UNION ALL
SELECT 
    'UPDATE' as operation,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'UPDATE'
        AND 'authenticated' = ANY(roles)
    ) as has_policy
UNION ALL
SELECT 
    'DELETE' as operation,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'DELETE'
        AND 'authenticated' = ANY(roles)
    ) as has_policy;

-- 5. Afficher le détail complet des politiques pour debug
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command_type,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE pol.polcmd::text
    END as operation,
    pol.polpermissive as is_permissive,
    ARRAY(
        SELECT rolname 
        FROM pg_roles 
        WHERE oid = ANY(pol.polroles)
    ) as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage' 
  AND c.relname = 'objects'
ORDER BY pol.polname;