import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    console.log('🔧 Création de la fonction de recherche FAQ...')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Créer la fonction de recherche textuelle simplifiée
      const createFunction = `
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
          -- Nettoyer la requête pour éviter les problèmes
          safe_query := regexp_replace(search_query, '[^\\w\\s]', ' ', 'g');
          safe_query := trim(safe_query);
          
          IF safe_query = '' OR safe_query IS NULL THEN
            -- Retourner les FAQ les plus récentes si pas de requête
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
            -- Recherche simple par mots
            RETURN QUERY
            SELECT 
              fi.id,
              fi.question,
              fi.answer,
              fi.category,
              -- Score basé sur le nombre de mots trouvés
              (
                CASE 
                  WHEN lower(fi.question) LIKE '%' || lower(safe_query) || '%' THEN 1.0
                  WHEN lower(fi.answer) LIKE '%' || lower(safe_query) || '%' THEN 0.8
                  ELSE 0.5
                END
              )::FLOAT AS rank
            FROM faq_items fi
            WHERE fi.is_published = true
            AND (
              lower(fi.question) LIKE '%' || lower(safe_query) || '%'
              OR lower(fi.answer) LIKE '%' || lower(safe_query) || '%'
            )
            ORDER BY rank DESC
            LIMIT match_count;
          END IF;
        END;
        $$;
      `;

      await client.queryArray(createFunction)
      console.log('✅ Fonction search_faq_text créée')

      // Créer aussi une version pour les embeddings (stub pour l'instant)
      const createEmbeddingFunction = `
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
          -- Pour l'instant, utiliser la recherche textuelle
          -- Plus tard, on pourra implémenter la vraie recherche vectorielle
          RETURN QUERY
          SELECT 
            id,
            question,
            answer,
            category,
            rank AS similarity
          FROM search_faq_text(query_text, match_count);
        END;
        $$;
      `;

      await client.queryArray(createEmbeddingFunction)
      console.log('✅ Fonction search_faq_embeddings créée (stub)')

      // Donner les permissions
      await client.queryArray('GRANT EXECUTE ON FUNCTION search_faq_text TO anon, authenticated')
      await client.queryArray('GRANT EXECUTE ON FUNCTION search_faq_embeddings TO anon, authenticated')
      console.log('✅ Permissions accordées')

      // Tester la fonction
      const testResult = await client.queryObject(
        'SELECT * FROM search_faq_text($1, $2)',
        ['test', 3]
      )
      console.log(`✅ Test de la fonction: ${testResult.rows.length} résultats`)

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fonctions de recherche FAQ créées avec succès'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } catch (error) {
      await client.end()
      throw error
    }
  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})