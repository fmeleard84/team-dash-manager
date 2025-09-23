import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Début de l\'application du système pgvector')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const results = {
      extension: false,
      tables: {
        project_embeddings: false,
        project_embedding_queue: false
      },
      functions: {
        search_project_embeddings: false,
        get_project_context_for_ai: false,
        queue_project_content_for_embedding: false
      },
      triggers: {
        messages: false,
        drive: false,
        kanban: false
      },
      errors: []
    }

    // 1. Activer l'extension pgvector
    try {
      console.log('1️⃣ Activation de pgvector...')
      await supabaseClient.rpc('exec_sql', {
        query: 'CREATE EXTENSION IF NOT EXISTS vector;'
      }).single()
      results.extension = true
      console.log('✅ Extension pgvector activée')
    } catch (error) {
      // Essayer directement
      const { error: extError } = await supabaseClient
        .from('pg_extension')
        .select('*')
        .eq('extname', 'vector')
        .single()

      if (!extError) {
        results.extension = true
        console.log('✅ Extension pgvector déjà activée')
      } else {
        results.errors.push(`Extension: ${error.message}`)
        console.error('❌ Erreur extension:', error)
      }
    }

    // 2. Créer les tables principales
    console.log('2️⃣ Création des tables...')

    // Table project_embeddings
    const createEmbeddingsTable = `
      CREATE TABLE IF NOT EXISTS public.project_embeddings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        content_type TEXT CHECK (content_type IN (
          'message', 'document', 'kanban_card', 'decision',
          'deliverable', 'meeting_note', 'task_update'
        )),
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    try {
      const { error } = await supabaseClient.rpc('exec_sql', {
        query: createEmbeddingsTable
      }).single()
      if (!error) {
        results.tables.project_embeddings = true
        console.log('✅ Table project_embeddings créée')
      }
    } catch (error) {
      results.errors.push(`Table embeddings: ${error.message}`)
      console.error('❌ Erreur table embeddings:', error)
    }

    // Table project_embedding_queue
    const createQueueTable = `
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
    `

    try {
      const { error } = await supabaseClient.rpc('exec_sql', {
        query: createQueueTable
      }).single()
      if (!error) {
        results.tables.project_embedding_queue = true
        console.log('✅ Table project_embedding_queue créée')
      }
    } catch (error) {
      results.errors.push(`Table queue: ${error.message}`)
      console.error('❌ Erreur table queue:', error)
    }

    // 3. Créer les index
    console.log('3️⃣ Création des index...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_project_embeddings_vector ON project_embeddings USING hnsw (embedding vector_cosine_ops);',
      'CREATE INDEX IF NOT EXISTS idx_project_embeddings_project ON project_embeddings(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_project_embeddings_type ON project_embeddings(content_type);',
      'CREATE INDEX IF NOT EXISTS idx_project_embeddings_created ON project_embeddings(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON project_embedding_queue(status, created_at);',
      'CREATE INDEX IF NOT EXISTS idx_embedding_queue_project ON project_embedding_queue(project_id);'
    ]

    for (const indexQuery of indexes) {
      try {
        await supabaseClient.rpc('exec_sql', { query: indexQuery }).single()
      } catch (error) {
        console.warn('⚠️ Index:', error.message)
      }
    }

    // 4. Activer RLS
    console.log('4️⃣ Activation RLS...')
    try {
      await supabaseClient.rpc('exec_sql', {
        query: 'ALTER TABLE project_embeddings ENABLE ROW LEVEL SECURITY;'
      }).single()
      await supabaseClient.rpc('exec_sql', {
        query: 'ALTER TABLE project_embedding_queue ENABLE ROW LEVEL SECURITY;'
      }).single()
      console.log('✅ RLS activé')
    } catch (error) {
      console.warn('⚠️ RLS:', error.message)
    }

    // 5. Vérifier l'existence des tables
    const { data: tables } = await supabaseClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['project_embeddings', 'project_embedding_queue'])

    console.log('📊 Tables trouvées:', tables?.map(t => t.table_name))

    return new Response(JSON.stringify({
      success: true,
      message: 'Système pgvector configuré',
      results,
      tablesFound: tables?.map(t => t.table_name) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})