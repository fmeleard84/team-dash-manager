-- =====================================================
-- SYSTÈME DE SYNCHRONISATION AUTOMATIQUE VERS VECTORIEL
-- =====================================================

-- 1. TABLE FAQ (source de vérité)
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  -- Métadonnées de tracking
  embedding_synced_at TIMESTAMPTZ, -- Dernière synchro avec la base vectorielle
  embedding_version INTEGER DEFAULT 0, -- Version pour détecter les changements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE DE SYNCHRONISATION (queue de tâches)
CREATE TABLE IF NOT EXISTS embedding_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  action TEXT CHECK (action IN ('insert', 'update', 'delete')),
  content TEXT, -- Contenu à vectoriser
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(source_table, source_id, action, status)
);

-- Index pour la queue
CREATE INDEX idx_sync_queue_status ON embedding_sync_queue(status, created_at);
CREATE INDEX idx_sync_queue_source ON embedding_sync_queue(source_table, source_id);

-- 3. FONCTION POUR AJOUTER À LA QUEUE
CREATE OR REPLACE FUNCTION add_to_embedding_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_content TEXT;
  v_metadata JSONB;
BEGIN
  -- Préparer le contenu selon la table source
  CASE TG_TABLE_NAME
    WHEN 'faq_items' THEN
      IF TG_OP = 'DELETE' THEN
        v_content := OLD.question || ' ' || OLD.answer;
        v_metadata := jsonb_build_object(
          'type', 'faq',
          'category', OLD.category,
          'tags', OLD.tags
        );
      ELSE
        -- Pour INSERT ou UPDATE
        v_content := NEW.question || ' ' || NEW.answer;
        v_metadata := jsonb_build_object(
          'type', 'faq',
          'category', NEW.category,
          'tags', NEW.tags,
          'question', NEW.question,
          'answer', NEW.answer
        );
      END IF;
      
    WHEN 'projects' THEN
      IF TG_OP = 'DELETE' THEN
        v_content := OLD.title || ' ' || COALESCE(OLD.description, '');
        v_metadata := jsonb_build_object('type', 'project');
      ELSE
        v_content := NEW.title || ' ' || COALESCE(NEW.description, '');
        v_metadata := jsonb_build_object(
          'type', 'project',
          'status', NEW.status,
          'owner_id', NEW.owner_id
        );
      END IF;
      
    WHEN 'wiki_pages' THEN
      IF TG_OP = 'DELETE' THEN
        v_content := OLD.title || ' ' || COALESCE(OLD.content, '');
        v_metadata := jsonb_build_object('type', 'wiki');
      ELSE
        v_content := NEW.title || ' ' || COALESCE(NEW.content, '');
        v_metadata := jsonb_build_object(
          'type', 'wiki',
          'project_id', NEW.project_id
        );
      END IF;
      
    ELSE
      -- Cas générique pour d'autres tables
      v_content := to_json(COALESCE(NEW, OLD))::TEXT;
      v_metadata := jsonb_build_object('type', TG_TABLE_NAME);
  END CASE;

  -- Ajouter à la queue
  IF TG_OP = 'DELETE' THEN
    INSERT INTO embedding_sync_queue (
      source_table, 
      source_id, 
      action,
      content,
      metadata
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::TEXT,
      'delete',
      v_content,
      v_metadata
    ) ON CONFLICT (source_table, source_id, action, status) 
    DO UPDATE SET
      created_at = NOW(),
      retry_count = 0;
  ELSE
    -- Pour INSERT ou UPDATE
    INSERT INTO embedding_sync_queue (
      source_table, 
      source_id, 
      action,
      content,
      metadata
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      LOWER(TG_OP),
      v_content,
      v_metadata
    ) ON CONFLICT (source_table, source_id, action, status) 
    DO UPDATE SET
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      created_at = NOW(),
      retry_count = 0;
    
    -- Marquer l'embedding comme non synchronisé
    IF TG_TABLE_NAME = 'faq_items' THEN
      NEW.embedding_version = COALESCE(NEW.embedding_version, 0) + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGERS POUR AUTO-SYNCHRONISATION

-- Trigger pour FAQ
DROP TRIGGER IF EXISTS sync_faq_embeddings ON faq_items;
CREATE TRIGGER sync_faq_embeddings
  AFTER INSERT OR UPDATE OR DELETE ON faq_items
  FOR EACH ROW
  EXECUTE FUNCTION add_to_embedding_queue();

-- Trigger pour Projets (optionnel)
DROP TRIGGER IF EXISTS sync_project_embeddings ON projects;
CREATE TRIGGER sync_project_embeddings
  AFTER INSERT OR UPDATE OF title, description OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_to_embedding_queue();

-- 5. FONCTION DE TRAITEMENT DE LA QUEUE (appelée par Edge Function)
CREATE OR REPLACE FUNCTION process_embedding_sync(
  p_embedding vector(1536),
  p_queue_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_id UUID;
BEGIN
  -- Récupérer l'enregistrement de la queue
  SELECT * INTO v_queue_record
  FROM embedding_sync_queue
  WHERE id = p_queue_id AND status = 'processing';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Traiter selon l'action
  CASE v_queue_record.action
    WHEN 'delete' THEN
      -- Supprimer l'embedding existant
      DELETE FROM documentation_embeddings
      WHERE source_table = v_queue_record.source_table
        AND source_id = v_queue_record.source_id;
    
    WHEN 'insert', 'update' THEN
      -- Vérifier si un embedding existe déjà
      SELECT id INTO v_existing_id
      FROM documentation_embeddings
      WHERE source_table = v_queue_record.source_table
        AND source_id = v_queue_record.source_id;
      
      IF v_existing_id IS NOT NULL THEN
        -- Mettre à jour l'embedding existant
        UPDATE documentation_embeddings
        SET 
          content = v_queue_record.content,
          embedding = p_embedding,
          metadata = v_queue_record.metadata,
          content_type = COALESCE(
            v_queue_record.metadata->>'type',
            'documentation'
          ),
          updated_at = NOW()
        WHERE id = v_existing_id;
      ELSE
        -- Créer un nouvel embedding
        INSERT INTO documentation_embeddings (
          content,
          content_type,
          metadata,
          embedding,
          source_id,
          source_table
        ) VALUES (
          v_queue_record.content,
          COALESCE(
            v_queue_record.metadata->>'type',
            'documentation'
          ),
          v_queue_record.metadata,
          p_embedding,
          v_queue_record.source_id,
          v_queue_record.source_table
        );
      END IF;
      
      -- Mettre à jour le timestamp de synchro sur la table source
      IF v_queue_record.source_table = 'faq_items' THEN
        UPDATE faq_items 
        SET embedding_synced_at = NOW()
        WHERE id = v_queue_record.source_id::UUID;
      END IF;
  END CASE;

  -- Marquer comme traité
  UPDATE embedding_sync_queue
  SET 
    status = 'completed',
    processed_at = NOW()
  WHERE id = p_queue_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. VUE POUR MONITORING
CREATE OR REPLACE VIEW embedding_sync_status AS
SELECT 
  source_table,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  MAX(created_at) FILTER (WHERE status = 'pending') as oldest_pending,
  MAX(processed_at) FILTER (WHERE status = 'completed') as last_processed
FROM embedding_sync_queue
GROUP BY source_table;

-- 7. FONCTION DE NETTOYAGE (garder 7 jours d'historique)
CREATE OR REPLACE FUNCTION clean_processed_sync_queue()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM embedding_sync_queue
  WHERE status = 'completed'
    AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. FONCTION POUR FORCER LA RE-SYNCHRONISATION
CREATE OR REPLACE FUNCTION force_resync_embeddings(
  p_source_table TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- FAQ
  IF p_source_table IS NULL OR p_source_table = 'faq_items' THEN
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    SELECT 
      'faq_items',
      id::TEXT,
      'update',
      question || ' ' || answer,
      jsonb_build_object(
        'type', 'faq',
        'category', category,
        'tags', tags,
        'question', question,
        'answer', answer
      )
    FROM faq_items
    WHERE is_published = true
    ON CONFLICT (source_table, source_id, action, status) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  -- Projets
  IF p_source_table IS NULL OR p_source_table = 'projects' THEN
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    SELECT 
      'projects',
      id::TEXT,
      'update',
      title || ' ' || COALESCE(description, ''),
      jsonb_build_object(
        'type', 'project',
        'status', status
      )
    FROM projects
    WHERE status != 'completed'
    ON CONFLICT (source_table, source_id, action, status) DO NOTHING;
    
    GET DIAGNOSTICS v_count = v_count + ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 9. EXEMPLE D'UTILISATION POUR RECHERCHE HYBRIDE
CREATE OR REPLACE FUNCTION search_faq_hybrid(
  p_query TEXT,
  p_embedding vector(1536) DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH text_search AS (
    -- Recherche textuelle classique
    SELECT 
      f.id,
      f.question,
      f.answer,
      f.category,
      ts_rank(
        to_tsvector('french', f.question || ' ' || f.answer),
        plainto_tsquery('french', p_query)
      ) as text_score
    FROM faq_items f
    WHERE f.is_published = true
      AND to_tsvector('french', f.question || ' ' || f.answer) @@ plainto_tsquery('french', p_query)
  ),
  vector_search AS (
    -- Recherche vectorielle si embedding fourni
    SELECT 
      f.id,
      f.question,
      f.answer,
      f.category,
      1 - (de.embedding <=> p_embedding) as vector_score
    FROM documentation_embeddings de
    JOIN faq_items f ON f.id = de.source_id::UUID
    WHERE de.source_table = 'faq_items'
      AND f.is_published = true
      AND p_embedding IS NOT NULL
  )
  -- Combiner les scores (pondération 30% texte, 70% vecteur si disponible)
  SELECT DISTINCT
    COALESCE(t.id, v.id) as id,
    COALESCE(t.question, v.question) as question,
    COALESCE(t.answer, v.answer) as answer,
    COALESCE(t.category, v.category) as category,
    CASE 
      WHEN p_embedding IS NOT NULL THEN
        COALESCE(t.text_score * 0.3, 0) + COALESCE(v.vector_score * 0.7, 0)
      ELSE
        COALESCE(t.text_score, 0)
    END as score
  FROM text_search t
  FULL OUTER JOIN vector_search v ON t.id = v.id
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;