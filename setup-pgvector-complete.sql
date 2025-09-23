-- =========================================
-- SETUP COMPLET PGVECTOR POUR SUPABASE
-- =========================================
-- À exécuter dans le Dashboard Supabase > SQL Editor

-- 1. ACTIVER L'EXTENSION PGVECTOR
-- ================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Vérifier que l'extension est activée
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 2. CRÉER LES TABLES SI ELLES N'EXISTENT PAS
-- ============================================

-- Table principale des embeddings
CREATE TABLE IF NOT EXISTS public.project_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN (
    'message', 'document', 'kanban_card', 'decision',
    'deliverable', 'meeting_note', 'task_update'
  )),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de queue pour traitement asynchrone
CREATE TABLE IF NOT EXISTS public.project_embedding_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 3. CRÉER LES INDEX POUR PERFORMANCE
-- ====================================
CREATE INDEX IF NOT EXISTS idx_project_embeddings_project ON project_embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_embeddings_type ON project_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_project_embeddings_created ON project_embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON project_embedding_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_project ON project_embedding_queue(project_id);

-- Index HNSW pour recherche vectorielle (seulement si pgvector supporté)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_project_embeddings_vector
    ON project_embeddings
    USING hnsw (embedding vector_cosine_ops);
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Index HNSW non créé: %', SQLERRM;
END $$;

-- 4. CRÉER LES FONCTIONS RPC
-- ==========================

-- Fonction de recherche vectorielle simplifiée (sans vérification auth pour test)
CREATE OR REPLACE FUNCTION search_project_embeddings_simple(
  p_project_id UUID,
  p_query_text TEXT,
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.content,
    pe.content_type,
    pe.metadata,
    pe.created_at
  FROM project_embeddings pe
  WHERE
    pe.project_id = p_project_id
    AND pe.content ILIKE '%' || p_query_text || '%'
  ORDER BY pe.created_at DESC
  LIMIT p_match_count;
END;
$$;

-- Fonction pour obtenir le contexte du projet
CREATE OR REPLACE FUNCTION get_project_context_simple(
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'embeddings_count', (
      SELECT COUNT(*) FROM project_embeddings
      WHERE project_id = p_project_id
    ),
    'queue_pending', (
      SELECT COUNT(*) FROM project_embedding_queue
      WHERE project_id = p_project_id AND status = 'pending'
    ),
    'recent_content', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', content_type,
          'content', LEFT(content, 100),
          'created', created_at
        ) ORDER BY created_at DESC
      )
      FROM (
        SELECT * FROM project_embeddings
        WHERE project_id = p_project_id
        ORDER BY created_at DESC
        LIMIT 5
      ) sub
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$;

-- 5. CRÉER LES TRIGGERS POUR AUTO-SYNC
-- =====================================

-- Trigger pour synchroniser les messages
CREATE OR REPLACE FUNCTION sync_message_to_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le message est dans un thread de projet
  IF EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = NEW.thread_id
    AND mt.project_id IS NOT NULL
  ) THEN
    INSERT INTO project_embedding_queue (
      project_id,
      source_table,
      source_id,
      content,
      content_type,
      metadata
    )
    SELECT
      mt.project_id,
      'messages',
      NEW.id,
      NEW.content,
      'message',
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'sender_id', NEW.sender_id,
        'sender_name', NEW.sender_name,
        'created_at', NEW.created_at
      )
    FROM message_threads mt
    WHERE mt.id = NEW.thread_id
    AND mt.project_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger si la table messages existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    DROP TRIGGER IF EXISTS trigger_sync_message_embeddings ON messages;
    CREATE TRIGGER trigger_sync_message_embeddings
      AFTER INSERT OR UPDATE ON messages
      FOR EACH ROW
      EXECUTE FUNCTION sync_message_to_embeddings();
  END IF;
END $$;

-- Trigger pour synchroniser les fichiers Drive/Kanban
CREATE OR REPLACE FUNCTION sync_kanban_file_to_embeddings()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Extraire le project_id du chemin
  IF NEW.file_path LIKE 'projects/%' THEN
    v_project_id := (regexp_match(NEW.file_path, 'projects/([a-f0-9-]+)'))[1]::UUID;

    IF v_project_id IS NOT NULL THEN
      INSERT INTO project_embedding_queue (
        project_id,
        source_table,
        source_id,
        content,
        content_type,
        metadata
      )
      VALUES (
        v_project_id,
        'kanban_files',
        NEW.id,
        COALESCE(NEW.file_name, '') || ' - Fichier uploadé',
        'document',
        jsonb_build_object(
          'filename', NEW.file_name,
          'file_type', NEW.file_type,
          'path', NEW.file_path,
          'uploaded_by', NEW.uploaded_by,
          'uploaded_at', NEW.uploaded_at
        )
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger si la table kanban_files existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kanban_files') THEN
    DROP TRIGGER IF EXISTS trigger_sync_kanban_file_embeddings ON kanban_files;
    CREATE TRIGGER trigger_sync_kanban_file_embeddings
      AFTER INSERT OR UPDATE ON kanban_files
      FOR EACH ROW
      EXECUTE FUNCTION sync_kanban_file_to_embeddings();
  END IF;
END $$;

-- 6. ACTIVER RLS (Row Level Security)
-- ====================================
ALTER TABLE project_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_embedding_queue ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour le service role
CREATE POLICY "service_role_all_access" ON project_embeddings
  FOR ALL
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "service_role_queue_access" ON project_embedding_queue
  FOR ALL
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- 7. VÉRIFIER L'INSTALLATION
-- ==========================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Vérifier les tables
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('project_embeddings', 'project_embedding_queue');

  RAISE NOTICE 'Tables créées: %', v_count;

  -- Vérifier les triggers
  SELECT COUNT(*) INTO v_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%embeddings%';

  RAISE NOTICE 'Triggers créés: %', v_count;

  -- Vérifier pgvector
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE NOTICE 'Extension pgvector: ACTIVE';
  ELSE
    RAISE NOTICE 'Extension pgvector: NON ACTIVE';
  END IF;
END $$;

-- 8. INSÉRER DES DONNÉES DE TEST
-- ===============================
DO $$
BEGIN
  -- Insérer un embedding de test si on a un projet
  IF EXISTS (SELECT 1 FROM projects LIMIT 1) THEN
    INSERT INTO project_embedding_queue (
      project_id,
      source_table,
      source_id,
      content,
      content_type,
      metadata
    )
    SELECT
      id,
      'test',
      gen_random_uuid(),
      'Test d''intégration pgvector - Document uploadé via Drive',
      'document',
      jsonb_build_object(
        'test', true,
        'created_at', NOW()
      )
    FROM projects
    LIMIT 1
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Données de test insérées';
  END IF;
END $$;

-- Afficher le résultat final
SELECT
  'project_embeddings' as table_name,
  COUNT(*) as count
FROM project_embeddings
UNION ALL
SELECT
  'project_embedding_queue' as table_name,
  COUNT(*) as count
FROM project_embedding_queue;