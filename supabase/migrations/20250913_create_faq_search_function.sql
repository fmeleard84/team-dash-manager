-- Fonction de recherche vectorielle pour les FAQ
-- Utilise pgvector pour la similarité cosinus

-- S'assurer que l'extension pgvector est activée
CREATE EXTENSION IF NOT EXISTS vector;

-- Créer la fonction de recherche FAQ avec embeddings
CREATE OR REPLACE FUNCTION search_faq_embeddings(
  query_text TEXT,
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si la table faq_embeddings existe avec des vecteurs
  -- on fait une recherche vectorielle
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'faq_embeddings' 
    AND column_name = 'embedding'
  ) THEN
    RETURN QUERY
    SELECT 
      fi.id,
      fi.question,
      fi.answer,
      fi.category,
      1 - (fe.embedding <=> (
        SELECT embedding 
        FROM faq_embeddings 
        WHERE content = query_text 
        LIMIT 1
      )) AS similarity
    FROM faq_items fi
    INNER JOIN faq_embeddings fe ON fi.id = fe.faq_item_id
    WHERE fi.is_published = true
    AND 1 - (fe.embedding <=> (
      SELECT embedding 
      FROM faq_embeddings 
      WHERE content = query_text 
      LIMIT 1
    )) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
  ELSE
    -- Fallback : recherche textuelle simple si pas d'embeddings
    RETURN QUERY
    SELECT 
      fi.id,
      fi.question,
      fi.answer,
      fi.category,
      -- Calculer une similarité basique basée sur la correspondance de mots
      (
        CASE 
          WHEN fi.question ILIKE '%' || query_text || '%' THEN 0.9
          WHEN fi.answer ILIKE '%' || query_text || '%' THEN 0.8
          ELSE 0.5
        END
      )::FLOAT AS similarity
    FROM faq_items fi
    WHERE fi.is_published = true
    AND (
      fi.question ILIKE '%' || query_text || '%'
      OR fi.answer ILIKE '%' || query_text || '%'
    )
    ORDER BY similarity DESC
    LIMIT match_count;
  END IF;
END;
$$;

-- Créer aussi une fonction de recherche textuelle plus robuste
CREATE OR REPLACE FUNCTION search_faq_text(
  search_query TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  safe_query TEXT;
BEGIN
  -- Nettoyer la requête pour éviter les problèmes de caractères spéciaux
  safe_query := regexp_replace(search_query, '[^\w\s]', ' ', 'g');
  safe_query := trim(safe_query);
  
  -- Si la requête est vide après nettoyage, retourner les FAQ les plus récentes
  IF safe_query = '' OR safe_query IS NULL THEN
    RETURN QUERY
    SELECT 
      fi.id,
      fi.question,
      fi.answer,
      fi.category,
      1.0::FLOAT AS rank
    FROM faq_items fi
    WHERE fi.is_published = true
    ORDER BY fi.updated_at DESC
    LIMIT match_count;
  ELSE
    -- Recherche textuelle avec ranking
    RETURN QUERY
    SELECT 
      fi.id,
      fi.question,
      fi.answer,
      fi.category,
      ts_rank(
        to_tsvector('french', coalesce(fi.question, '') || ' ' || coalesce(fi.answer, '')),
        plainto_tsquery('french', safe_query)
      )::FLOAT AS rank
    FROM faq_items fi
    WHERE fi.is_published = true
    AND to_tsvector('french', coalesce(fi.question, '') || ' ' || coalesce(fi.answer, ''))
        @@ plainto_tsquery('french', safe_query)
    ORDER BY rank DESC
    LIMIT match_count;
  END IF;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION search_faq_embeddings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_faq_text TO anon, authenticated;