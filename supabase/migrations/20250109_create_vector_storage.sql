-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table pour stocker les embeddings de la documentation et FAQs
CREATE TABLE IF NOT EXISTS documentation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('faq', 'documentation', 'client_info', 'project_info', 'wiki')),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_id TEXT, -- ID de la source (ex: project_id, client_id, etc.)
  source_table TEXT -- Table d'origine (ex: projects, client_profiles, etc.)
);

-- Index pour la recherche vectorielle (utilise HNSW pour de meilleures performances)
CREATE INDEX documentation_embeddings_embedding_idx ON documentation_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Index pour filtrer par type de contenu
CREATE INDEX idx_documentation_content_type ON documentation_embeddings(content_type);
CREATE INDEX idx_documentation_source ON documentation_embeddings(source_table, source_id);

-- RLS pour sécuriser l'accès
ALTER TABLE documentation_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "documentation_embeddings_read_policy" ON documentation_embeddings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Écriture uniquement pour les admins et le système
CREATE POLICY "documentation_embeddings_write_policy" ON documentation_embeddings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Fonction pour rechercher par similarité sémantique
CREATE OR REPLACE FUNCTION search_documentation(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.content_type,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM documentation_embeddings d
  WHERE 
    (filter_type IS NULL OR d.content_type = filter_type)
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Table pour stocker le contexte enrichi pour l'IA
CREATE TABLE IF NOT EXISTS ai_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key TEXT UNIQUE NOT NULL, -- Clé unique pour identifier le contexte
  context_data JSONB NOT NULL, -- Données structurées du contexte
  embedding vector(1536), -- Embedding du contexte pour recherche
  expires_at TIMESTAMPTZ, -- Date d'expiration du cache
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour le cache
CREATE INDEX idx_ai_context_key ON ai_context_cache(context_key);
CREATE INDEX idx_ai_context_expires ON ai_context_cache(expires_at);

-- Fonction pour nettoyer le cache expiré
CREATE OR REPLACE FUNCTION clean_expired_context_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_context_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Créer un job pour nettoyer le cache régulièrement (utilise pg_cron si disponible)
-- Si pg_cron n'est pas disponible, cette fonction peut être appelée manuellement ou via une Edge Function

-- Table pour l'historique des conversations avec l'IA
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  context TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'historique
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_ai_conversations_created ON ai_conversations(created_at DESC);

-- RLS pour l'historique des conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Chaque utilisateur ne peut voir que ses propres conversations
CREATE POLICY "ai_conversations_user_policy" ON ai_conversations
  FOR ALL
  USING (auth.uid() = user_id);

-- Fonction pour enrichir le contexte avec les données pertinentes
CREATE OR REPLACE FUNCTION get_enriched_context(
  p_user_id UUID,
  p_context_type TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
  v_user_role TEXT;
  v_projects JSONB;
  v_recent_tasks JSONB;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  -- Récupérer les projets actifs selon le rôle
  IF v_user_role = 'client' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'status', p.status,
        'team_size', (SELECT COUNT(*) FROM hr_resource_assignments WHERE project_id = p.id),
        'progress', p.progress
      )
    ) INTO v_projects
    FROM projects p
    WHERE p.owner_id = p_user_id
    AND p.status IN ('play', 'attente-team');
  ELSIF v_user_role = 'candidate' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'status', p.status,
        'role', hra.profile_id
      )
    ) INTO v_projects
    FROM projects p
    JOIN hr_resource_assignments hra ON hra.project_id = p.id
    WHERE hra.candidate_id = p_user_id
    AND hra.booking_status = 'accepted'
    AND p.status = 'play';
  END IF;

  -- Récupérer les tâches récentes (si contexte task-management)
  IF p_context_type = 'task-management' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', kt.id,
        'title', kt.title,
        'status', kt.status,
        'priority', kt.priority,
        'assigned_to', kt.assigned_to
      )
    ) INTO v_recent_tasks
    FROM kanban_tasks kt
    JOIN projects p ON kt.project_id = p.id
    WHERE (p.owner_id = p_user_id OR EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      WHERE hra.project_id = p.id
      AND hra.candidate_id = p_user_id
      AND hra.booking_status = 'accepted'
    ))
    ORDER BY kt.updated_at DESC
    LIMIT 10;
  END IF;

  -- Construire le contexte enrichi
  v_context := jsonb_build_object(
    'user_role', v_user_role,
    'user_id', p_user_id,
    'context_type', p_context_type,
    'timestamp', NOW(),
    'projects', COALESCE(v_projects, '[]'::jsonb),
    'recent_tasks', COALESCE(v_recent_tasks, '[]'::jsonb)
  );

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;