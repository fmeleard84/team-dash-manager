import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const steps = []

    // 1. Vérifier si pgvector est installé
    const { data: extensions, error: extError } = await supabase
      .rpc('get_extensions', {})
      .catch(() => ({ data: null, error: 'Function not found' }))

    let hasVector = false
    if (extensions) {
      hasVector = extensions.some((ext: any) => ext.name === 'vector')
    }

    steps.push({
      step: 'check_pgvector',
      status: hasVector ? 'exists' : 'missing',
      message: hasVector ? 'pgvector est déjà installé' : 'pgvector n\'est pas installé'
    })

    // 2. Installer pgvector si nécessaire
    if (!hasVector) {
      try {
        await supabase.rpc('create_extension', { name: 'vector' })
        steps.push({
          step: 'install_pgvector',
          status: 'success',
          message: 'pgvector installé avec succès'
        })
      } catch (error) {
        // Essayer avec SQL direct
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          query: 'CREATE EXTENSION IF NOT EXISTS vector;'
        }).catch(async () => {
          // Dernière tentative avec une requête simple
          return await supabase.from('extensions').insert({ name: 'vector' })
        })

        if (sqlError) {
          steps.push({
            step: 'install_pgvector',
            status: 'failed',
            message: 'Impossible d\'installer pgvector automatiquement. Veuillez l\'activer dans le dashboard Supabase.',
            error: sqlError
          })
        } else {
          steps.push({
            step: 'install_pgvector',
            status: 'success',
            message: 'pgvector installé via méthode alternative'
          })
        }
      }
    }

    // 3. Vérifier les tables existantes
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'documentation_embeddings', 
        'embedding_sync_queue',
        'faq_items',
        'prompts_ia',
        'ai_context_cache',
        'ai_conversations'
      ])

    const existingTables = tables?.map(t => t.table_name) || []
    
    steps.push({
      step: 'check_tables',
      status: 'checked',
      existing: existingTables,
      missing: [
        'documentation_embeddings',
        'embedding_sync_queue', 
        'faq_items',
        'prompts_ia',
        'ai_context_cache',
        'ai_conversations'
      ].filter(t => !existingTables.includes(t))
    })

    // 4. Créer les tables manquantes si pgvector est disponible
    const missingTables = steps[steps.length - 1].missing
    
    if (missingTables.length > 0 && (hasVector || steps.some(s => s.step === 'install_pgvector' && s.status === 'success'))) {
      const tableCreationQueries = {
        'prompts_ia': `
          CREATE TABLE IF NOT EXISTS prompts_ia (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            context TEXT NOT NULL,
            prompt TEXT NOT NULL,
            active BOOLEAN DEFAULT true,
            priority INTEGER DEFAULT 0,
            variables JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`,
        
        'faq_items': `
          CREATE TABLE IF NOT EXISTS faq_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT,
            tags TEXT[],
            is_published BOOLEAN DEFAULT true,
            order_index INTEGER DEFAULT 0,
            embedding_synced_at TIMESTAMPTZ,
            embedding_version INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`,
        
        'embedding_sync_queue': `
          CREATE TABLE IF NOT EXISTS embedding_sync_queue (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_table TEXT NOT NULL,
            source_id TEXT NOT NULL,
            action TEXT CHECK (action IN ('insert', 'update', 'delete')),
            content TEXT,
            metadata JSONB DEFAULT '{}',
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            processed_at TIMESTAMPTZ
          )`
      }

      for (const [tableName, query] of Object.entries(tableCreationQueries)) {
        if (missingTables.includes(tableName)) {
          try {
            // Note: Cette approche simplifiée ne créera pas les tables vectorielles
            // Car elles nécessitent le type vector(1536) qui n'est pas supporté ici
            steps.push({
              step: `create_${tableName}`,
              status: 'skipped',
              message: `Table ${tableName} nécessite une migration SQL complète`
            })
          } catch (error) {
            steps.push({
              step: `create_${tableName}`,
              status: 'failed',
              message: `Erreur création ${tableName}`,
              error: error.message
            })
          }
        }
      }
    }

    // 5. Recommandations
    const recommendations = []
    
    if (!hasVector && !steps.some(s => s.step === 'install_pgvector' && s.status === 'success')) {
      recommendations.push({
        priority: 'high',
        action: 'Activer pgvector',
        how: 'Dans le dashboard Supabase : Database > Extensions > Rechercher "vector" > Enable'
      })
    }

    if (missingTables.length > 0) {
      recommendations.push({
        priority: 'high', 
        action: 'Appliquer les migrations',
        how: 'Exécuter : npx supabase db push --project-ref egdelmcijszuapcpglsy'
      })
    }

    if (!Deno.env.get('OPENAI_API_KEY')) {
      recommendations.push({
        priority: 'medium',
        action: 'Configurer OPENAI_API_KEY',
        how: 'Dashboard Supabase > Settings > Edge Functions > Secrets > Add OPENAI_API_KEY'
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          pgvector: hasVector || steps.some(s => s.step === 'install_pgvector' && s.status === 'success'),
          tables_ready: missingTables.length === 0,
          ready_for_embeddings: false // Sera true quand tout est configuré
        },
        steps,
        recommendations,
        next_steps: [
          '1. Activer pgvector si nécessaire (voir recommendations)',
          '2. Appliquer les migrations SQL',
          '3. Configurer OPENAI_API_KEY', 
          '4. Déployer process-embedding-queue',
          '5. Tester avec une FAQ'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        help: 'Vérifiez les logs et assurez-vous d\'avoir les permissions admin'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})