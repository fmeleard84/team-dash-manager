-- Script pour créer les triggers de synchronisation automatique
-- À exécuter dans SQL Editor de Supabase

-- 1. Fonction pour ajouter à la queue
CREATE OR REPLACE FUNCTION add_to_embedding_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    VALUES (
      TG_TABLE_NAME, 
      OLD.id::TEXT, 
      'delete', 
      OLD.question || ' ' || OLD.answer, 
      jsonb_build_object(
        'type', 'faq', 
        'category', OLD.category,
        'tags', OLD.tags
      )
    )
    ON CONFLICT (source_table, source_id, action, status) DO NOTHING;
  ELSE
    -- Pour INSERT ou UPDATE
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    VALUES (
      TG_TABLE_NAME, 
      NEW.id::TEXT, 
      LOWER(TG_OP), 
      NEW.question || ' ' || NEW.answer,
      jsonb_build_object(
        'type', 'faq', 
        'category', NEW.category, 
        'question', NEW.question, 
        'answer', NEW.answer,
        'tags', NEW.tags
      )
    )
    ON CONFLICT (source_table, source_id, action, status) DO UPDATE
    SET 
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      created_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger pour FAQ
DROP TRIGGER IF EXISTS sync_faq_embeddings ON faq_items;
CREATE TRIGGER sync_faq_embeddings
  AFTER INSERT OR UPDATE OR DELETE ON faq_items
  FOR EACH ROW 
  EXECUTE FUNCTION add_to_embedding_queue();

-- 3. Fonction pour traiter la synchronisation (appelée par Edge Function)
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

-- 4. Test rapide : Ajouter une FAQ pour vérifier
INSERT INTO faq_items (question, answer, category, tags) 
VALUES (
  'Le trigger fonctionne-t-il ?',
  'Si vous voyez cette FAQ dans la queue de synchronisation, alors oui, le trigger fonctionne parfaitement !',
  'Test',
  ARRAY['test', 'trigger', 'sync']
) RETURNING id;

-- 5. Vérifier que l'entrée est dans la queue
SELECT 
  id,
  source_table,
  source_id,
  action,
  status,
  created_at
FROM embedding_sync_queue
WHERE source_table = 'faq_items'
ORDER BY created_at DESC
LIMIT 5;