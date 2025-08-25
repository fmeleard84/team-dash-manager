-- Vérification des politiques RLS pour les projets
-- CRITICAL: S'assurer que chaque client ne voit que SES projets

-- 1. Vérifier les politiques actuelles sur la table projects
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause,
    polroles::regrole[] as roles
FROM pg_policy 
WHERE polrelid = 'projects'::regclass;

-- 2. Vérifier les politiques actuelles sur kanban_columns
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'kanban_columns'::regclass;

-- 3. Vérifier les politiques actuelles sur kanban_cards
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'kanban_cards'::regclass;

-- 4. Vérifier les politiques actuelles sur message_threads
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'message_threads'::regclass;

-- 5. Vérifier les politiques actuelles sur messages
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'messages'::regclass;