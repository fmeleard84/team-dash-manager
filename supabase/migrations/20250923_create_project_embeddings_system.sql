-- =========================================
-- SYSTÈME PGVECTOR POUR CONTEXTE PROJET IA
-- =========================================
-- Permet aux IA candidates d'avoir accès au contexte complet du projet
-- incluant messages, documents Drive, cartes Kanban et décisions

-- 1. TABLE PRINCIPALE: project_embeddings
-- ========================================
CREATE TABLE IF NOT EXISTS public.project_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN (
    'message',      -- Messages d'équipe
    'document',     -- Documents Drive
    'kanban_card',  -- Cartes Kanban
    'decision',     -- Décisions importantes
    'deliverable',  -- Livrables générés
    'meeting_note', -- Notes de réunion
    'task_update'   -- Mises à jour de tâches
  )),
  embedding vector(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}', -- Métadonnées additionnelles
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexation pour performance
  CONSTRAINT project_embeddings_project_id_idx UNIQUE (id, project_id)
);

-- Index HNSW pour recherche vectorielle rapide
CREATE INDEX IF NOT EXISTS idx_project_embeddings_vector
  ON project_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Index pour filtrer par projet et type
CREATE INDEX IF NOT EXISTS idx_project_embeddings_project
  ON project_embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_embeddings_type
  ON project_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_project_embeddings_created
  ON project_embeddings(created_at DESC);

-- 2. TABLE DE QUEUE POUR TRAITEMENT ASYNCHRONE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_embedding_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

-- Index pour traitement efficace de la queue
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status
  ON project_embedding_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_project
  ON project_embedding_queue(project_id);

-- 3. FONCTION RPC: Recherche vectorielle dans le contexte projet
-- ==============================================================
CREATE OR REPLACE FUNCTION search_project_embeddings(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 10,
  p_content_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  metadata JSONB,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur a accès au projet
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
    LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE p.id = p_project_id
    AND (
      p.owner_id = auth.uid()
      OR cp.user_id = auth.uid()
      OR hra.candidate_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé au projet';
  END IF;

  RETURN QUERY
  SELECT
    pe.id,
    pe.content,
    pe.content_type,
    pe.metadata,
    1 - (pe.embedding <=> p_query_embedding) as similarity,
    pe.created_at,
    pe.created_by
  FROM project_embeddings pe
  WHERE
    pe.project_id = p_project_id
    AND (p_content_types IS NULL OR pe.content_type = ANY(p_content_types))
    AND pe.embedding IS NOT NULL
    AND (1 - (pe.embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY pe.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- 4. FONCTION: Ajouter du contenu à la queue d'embedding
-- ======================================================
CREATE OR REPLACE FUNCTION queue_project_content_for_embedding(
  p_project_id UUID,
  p_content TEXT,
  p_content_type TEXT,
  p_source_table TEXT,
  p_source_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  -- Vérifier les permissions
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
    LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE p.id = p_project_id
    AND (
      p.owner_id = auth.uid()
      OR cp.user_id = auth.uid()
      OR hra.candidate_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé au projet';
  END IF;

  -- Ajouter à la queue
  INSERT INTO project_embedding_queue (
    project_id,
    source_table,
    source_id,
    content,
    content_type,
    metadata
  ) VALUES (
    p_project_id,
    p_source_table,
    p_source_id,
    p_content,
    p_content_type,
    p_metadata
  ) RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- 5. TRIGGERS: Synchronisation automatique
-- ========================================

-- Trigger pour les messages
CREATE OR REPLACE FUNCTION sync_message_to_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement pour les messages dans des threads de projet
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
    AND mt.project_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_message_embeddings ON messages;
CREATE TRIGGER trigger_sync_message_embeddings
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_message_to_embeddings();

-- Trigger pour les fichiers Drive
CREATE OR REPLACE FUNCTION sync_drive_file_to_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Extraire le project_id du path (format: projects/{project_id}/...)
  IF NEW.path LIKE 'projects/%' THEN
    INSERT INTO project_embedding_queue (
      project_id,
      source_table,
      source_id,
      content,
      content_type,
      metadata
    )
    SELECT
      (regexp_match(NEW.path, 'projects/([^/]+)'))[1]::UUID,
      'kanban_files',
      NEW.id,
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''),
      'document',
      jsonb_build_object(
        'filename', NEW.name,
        'file_type', NEW.file_type,
        'path', NEW.path,
        'created_by', NEW.created_by,
        'created_at', NEW.created_at
      )
    WHERE (regexp_match(NEW.path, 'projects/([^/]+)'))[1] IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_drive_embeddings ON kanban_files;
CREATE TRIGGER trigger_sync_drive_embeddings
  AFTER INSERT OR UPDATE ON kanban_files
  FOR EACH ROW
  EXECUTE FUNCTION sync_drive_file_to_embeddings();

-- Trigger pour les cartes Kanban
CREATE OR REPLACE FUNCTION sync_kanban_card_to_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    INSERT INTO project_embedding_queue (
      project_id,
      source_table,
      source_id,
      content,
      content_type,
      metadata
    )
    VALUES (
      NEW.project_id,
      'kanban_cards',
      NEW.id,
      NEW.title || ' ' || COALESCE(NEW.description, ''),
      'kanban_card',
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'assigned_to', NEW.assigned_to,
        'priority', NEW.priority,
        'due_date', NEW.due_date,
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_kanban_embeddings ON kanban_cards;
CREATE TRIGGER trigger_sync_kanban_embeddings
  AFTER INSERT OR UPDATE ON kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION sync_kanban_card_to_embeddings();

-- 6. POLITIQUES RLS
-- =================

-- Activer RLS sur les tables
ALTER TABLE project_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_embedding_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture des embeddings pour les membres du projet
CREATE POLICY "project_embeddings_read_policy" ON project_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
      LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE p.id = project_embeddings.project_id
      AND (
        p.owner_id = auth.uid()
        OR cp.user_id = auth.uid()
        OR hra.candidate_id = auth.uid()
      )
    )
  );

-- Policy: Insertion dans la queue pour les membres du projet
CREATE POLICY "embedding_queue_insert_policy" ON project_embedding_queue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
      LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE p.id = project_embedding_queue.project_id
      AND (
        p.owner_id = auth.uid()
        OR cp.user_id = auth.uid()
        OR hra.candidate_id = auth.uid()
      )
    )
  );

-- Policy: Lecture de la queue pour le service
CREATE POLICY "embedding_queue_service_policy" ON project_embedding_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- 7. FONCTION: Obtenir le contexte enrichi pour l'IA
-- ==================================================
CREATE OR REPLACE FUNCTION get_project_context_for_ai(
  p_project_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context JSONB;
BEGIN
  -- Vérifier les permissions
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
    LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
    WHERE p.id = p_project_id
    AND (
      p.owner_id = auth.uid()
      OR cp.user_id = auth.uid()
      OR hra.candidate_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object('error', 'Accès non autorisé');
  END IF;

  -- Construire le contexte
  SELECT jsonb_build_object(
    'project_info', (
      SELECT jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'description', p.description,
        'status', p.status,
        'start_date', p.start_date,
        'end_date', p.end_date
      )
      FROM projects p
      WHERE p.id = p_project_id
    ),
    'recent_messages', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'content', m.content,
          'sender_name', m.sender_name,
          'created_at', m.created_at
        ) ORDER BY m.created_at DESC
      )
      FROM (
        SELECT DISTINCT ON (m.id) m.*
        FROM messages m
        JOIN message_threads mt ON mt.id = m.thread_id
        WHERE mt.project_id = p_project_id
        ORDER BY m.id, m.created_at DESC
        LIMIT p_limit
      ) m
    ),
    'active_tasks', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', kc.title,
          'description', kc.description,
          'status', kc.status,
          'assigned_to', kc.assigned_to,
          'due_date', kc.due_date
        ) ORDER BY kc.created_at DESC
      )
      FROM (
        SELECT * FROM kanban_cards kc
        WHERE kc.project_id = p_project_id
        AND kc.status IN ('todo', 'in_progress')
        LIMIT p_limit
      ) kc
    ),
    'recent_documents', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', kf.name,
          'type', kf.file_type,
          'path', kf.path,
          'created_at', kf.created_at
        ) ORDER BY kf.created_at DESC
      )
      FROM (
        SELECT * FROM kanban_files kf
        WHERE kf.path LIKE 'projects/' || p_project_id || '/%'
        ORDER BY kf.created_at DESC
        LIMIT p_limit
      ) kf
    ),
    'team_members', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'profile_name', hp.name,
          'is_ai', hp.is_ai,
          'candidate_name', cp.first_name || ' ' || cp.last_name,
          'booking_status', hra.booking_status
        )
      )
      FROM hr_resource_assignments hra
      LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
      LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id = p_project_id
      AND hra.booking_status = 'accepted'
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$;

-- 8. FONCTION DE NETTOYAGE
-- ========================
CREATE OR REPLACE FUNCTION clean_old_embeddings(
  p_days_to_keep INT DEFAULT 90
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM project_embeddings
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Nettoyer aussi la queue des éléments traités
  DELETE FROM project_embedding_queue
  WHERE status = 'completed'
  AND processed_at < NOW() - INTERVAL '7 days';

  RETURN v_deleted_count;
END;
$$;

-- Créer des index supplémentaires pour optimiser les requêtes communes
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_project
  ON message_threads(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_status
  ON kanban_cards(project_id, status);
CREATE INDEX IF NOT EXISTS idx_kanban_files_path_prefix
  ON kanban_files(path text_pattern_ops);