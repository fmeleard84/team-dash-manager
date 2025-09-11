-- Fonction pour notifier les changements de FAQ
CREATE OR REPLACE FUNCTION notify_faq_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier pour synchronisation
  PERFORM pg_notify('faq_changes', json_build_object(
    'action', TG_OP,
    'faq_id', COALESCE(NEW.id, OLD.id),
    'is_active', COALESCE(NEW.is_active, FALSE)
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour capturer les changements sur ai_faq
DROP TRIGGER IF EXISTS trigger_faq_changes ON ai_faq;
CREATE TRIGGER trigger_faq_changes
  AFTER INSERT OR UPDATE OR DELETE ON ai_faq
  FOR EACH ROW
  EXECUTE FUNCTION notify_faq_changes();

-- Table pour stocker la queue de synchronisation
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Index pour la queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);

-- Fonction pour ajouter à la queue de synchronisation
CREATE OR REPLACE FUNCTION add_to_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sync_queue (table_name, record_id, action)
  VALUES ('ai_faq', COALESCE(NEW.id, OLD.id)::text, TG_OP);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour ajouter à la queue
DROP TRIGGER IF EXISTS trigger_faq_sync_queue ON ai_faq;
CREATE TRIGGER trigger_faq_sync_queue
  AFTER INSERT OR UPDATE OR DELETE ON ai_faq
  FOR EACH ROW
  EXECUTE FUNCTION add_to_sync_queue();

-- Fonction pour rechercher dans les FAQs avec la base vectorielle
CREATE OR REPLACE FUNCTION search_faq_semantic(
  query_text TEXT,
  max_results INT DEFAULT 5,
  min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  tags TEXT[],
  similarity FLOAT
) AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Cette fonction sera appelée depuis une Edge Function qui générera l'embedding
  -- Pour l'instant, on retourne une recherche textuelle simple
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.category,
    f.tags,
    1.0::FLOAT as similarity
  FROM ai_faq f
  WHERE f.is_active = true
  AND (
    f.question ILIKE '%' || query_text || '%'
    OR f.answer ILIKE '%' || query_text || '%'
    OR f.category ILIKE '%' || query_text || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(f.tags) AS t(tag)
      WHERE t.tag ILIKE '%' || query_text || '%'
    )
  )
  ORDER BY f.order_index
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Ajouter une colonne pour suivre la dernière synchronisation
ALTER TABLE ai_faq ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Fonction pour marquer une FAQ comme synchronisée
CREATE OR REPLACE FUNCTION mark_faq_synced(faq_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_faq 
  SET last_sync_at = NOW()
  WHERE id = faq_id;
END;
$$ LANGUAGE plpgsql;