-- Script pour extraire la structure complète de la base de données
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. LISTER TOUTES LES TABLES
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. STRUCTURE DÉTAILLÉE DES TABLES IMPORTANTES
\echo '=== STRUCTURE DÉTAILLÉE ==='

-- Projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Candidate Profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'candidate_profiles'
ORDER BY ordinal_position;

-- HR Resource Assignments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'hr_resource_assignments'
ORDER BY ordinal_position;

-- Messages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Kanban Files
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'kanban_files'
ORDER BY ordinal_position;

-- Project Embeddings (si existe)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_embeddings'
ORDER BY ordinal_position;

-- 3. COMPTER LES ENREGISTREMENTS
\echo '=== COMPTAGE DES DONNÉES ==='

SELECT
  'projects' as table_name,
  COUNT(*) as row_count
FROM projects
UNION ALL
SELECT
  'candidate_profiles' as table_name,
  COUNT(*) as row_count
FROM candidate_profiles
UNION ALL
SELECT
  'client_profiles' as table_name,
  COUNT(*) as row_count
FROM client_profiles
UNION ALL
SELECT
  'hr_resource_assignments' as table_name,
  COUNT(*) as row_count
FROM hr_resource_assignments
UNION ALL
SELECT
  'messages' as table_name,
  COUNT(*) as row_count
FROM messages
UNION ALL
SELECT
  'kanban_files' as table_name,
  COUNT(*) as row_count
FROM kanban_files;

-- 4. VÉRIFIER LES EXTENSIONS
\echo '=== EXTENSIONS ACTIVÉES ==='
SELECT extname, extversion FROM pg_extension ORDER BY extname;