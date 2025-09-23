-- =========================================
-- ACTIVATION PGVECTOR ET CRÉATION DES TABLES
-- =========================================

-- Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Vérifier si l'extension est activée
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Appliquer la migration complète des embeddings
\i /opt/team-dash-manager/supabase/migrations/20250923_create_project_embeddings_system.sql

-- Vérifier que les tables sont créées
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('project_embeddings', 'project_embedding_queue');