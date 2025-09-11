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

    const results = []

    // 1. Vérifier pgvector
    const { data: extensions } = await supabase.rpc('get_extensions', {}).catch(() => ({ data: [] }))
    const hasVector = extensions?.some((ext: any) => ext.name === 'vector')
    
    if (!hasVector) {
      // Essayer d'activer pgvector
      try {
        await supabase.rpc('create_extension', { name: 'vector' })
        results.push({ step: 'pgvector', status: 'installed' })
      } catch (e) {
        results.push({ step: 'pgvector', status: 'failed', error: 'Activez pgvector dans le dashboard' })
      }
    } else {
      results.push({ step: 'pgvector', status: 'already_installed' })
    }

    // 2. Créer la table prompts_ia
    try {
      await supabase.rpc('exec_sql', {
        query: `
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
          );
        `
      }).catch(async () => {
        // Méthode alternative
        const { error } = await supabase.from('prompts_ia').select('id').limit(1)
        if (error?.code === '42P01') { // Table n'existe pas
          throw new Error('Table prompts_ia n\'existe pas')
        }
      })
      results.push({ step: 'prompts_ia', status: 'created' })
    } catch (e) {
      results.push({ step: 'prompts_ia', status: 'failed', error: e.message })
    }

    // 3. Insérer les prompts par défaut
    try {
      const { error } = await supabase
        .from('prompts_ia')
        .upsert([
          {
            id: 'general',
            name: 'Assistant Général',
            context: 'general',
            prompt: `Tu es l'assistant vocal intelligent de Team Dash Manager, une plateforme de gestion de projets avec matching de ressources humaines.

IDENTITÉ :
- Nom : Assistant Team Dash
- Rôle : Assistant personnel pour la gestion de projets et d'équipes
- Personnalité : Professionnel, efficace, proactif et amical

CAPACITÉS PRINCIPALES :
1. Expliquer le fonctionnement de n'importe quelle partie de la plateforme
2. Composer des équipes optimales via ReactFlow
3. Créer et gérer des réunions dans le planning
4. Ajouter et suivre des tâches dans le Kanban
5. Naviguer et guider dans l'interface
6. Répondre aux questions sur l'état des projets`,
            active: true,
            priority: 0
          },
          {
            id: 'team-composition',
            name: 'Composition d\'Équipe',
            context: 'team-composition',
            prompt: `CONTEXTE SPÉCIFIQUE : Composition d'équipe dans ReactFlow

Tu assistes l'utilisateur pour composer l'équipe optimale pour son projet.

EXPERTISE DOMAINE :
- Profils métiers tech : Développeur (Frontend/Backend/Fullstack/Mobile), DevOps, Data Scientist, UX/UI Designer
- Profils gestion : Chef de projet, Product Owner, Scrum Master, Business Analyst`,
            active: true,
            priority: 1
          }
        ], { onConflict: 'id' })
      
      if (!error) {
        results.push({ step: 'default_prompts', status: 'inserted' })
      } else {
        results.push({ step: 'default_prompts', status: 'failed', error: error.message })
      }
    } catch (e) {
      results.push({ step: 'default_prompts', status: 'failed', error: e.message })
    }

    // 4. Créer la table FAQ
    try {
      await supabase.rpc('exec_sql', {
        query: `
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
          );
        `
      }).catch(async () => {
        const { error } = await supabase.from('faq_items').select('id').limit(1)
        if (error?.code !== '42P01') {
          return { status: 'exists' }
        }
        throw error
      })
      results.push({ step: 'faq_items', status: 'created' })
    } catch (e) {
      results.push({ step: 'faq_items', status: 'failed', error: e.message })
    }

    // 5. Créer la table documentation_embeddings (nécessite pgvector)
    if (hasVector) {
      try {
        await supabase.rpc('exec_sql', {
          query: `
            CREATE TABLE IF NOT EXISTS documentation_embeddings (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              content TEXT NOT NULL,
              content_type TEXT,
              metadata JSONB DEFAULT '{}',
              embedding vector(1536),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              source_id TEXT,
              source_table TEXT
            );
            
            CREATE INDEX IF NOT EXISTS documentation_embeddings_embedding_idx 
            ON documentation_embeddings USING hnsw (embedding vector_cosine_ops);
          `
        }).catch(() => ({ status: 'failed' }))
        results.push({ step: 'documentation_embeddings', status: 'created' })
      } catch (e) {
        results.push({ step: 'documentation_embeddings', status: 'failed', error: e.message })
      }
    }

    // 6. Créer la table de synchronisation
    try {
      await supabase.rpc('exec_sql', {
        query: `
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
          );
          
          CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
          ON embedding_sync_queue(status, created_at);
        `
      }).catch(() => ({ status: 'failed' }))
      results.push({ step: 'embedding_sync_queue', status: 'created' })
    } catch (e) {
      results.push({ step: 'embedding_sync_queue', status: 'failed', error: e.message })
    }

    // 7. Récupérer la clé OpenAI depuis localStorage (pour info)
    const openAIInfo = {
      in_env: !!Deno.env.get('OPENAI_API_KEY'),
      message: Deno.env.get('OPENAI_API_KEY') 
        ? 'Clé OpenAI configurée dans les secrets' 
        : 'Configurez OPENAI_API_KEY dans Dashboard > Settings > Edge Functions > Secrets'
    }

    // Résumé
    const summary = {
      pgvector_ready: hasVector,
      tables_created: results.filter(r => r.status === 'created' || r.status === 'already_installed').length,
      tables_failed: results.filter(r => r.status === 'failed').length,
      openai_configured: openAIInfo.in_env,
      ready_for_production: hasVector && openAIInfo.in_env && results.filter(r => r.status === 'failed').length === 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        openai: openAIInfo,
        next_steps: summary.ready_for_production 
          ? ['✅ Système prêt !', 'Testez avec une FAQ', 'Configurez le CRON pour traitement automatique']
          : [
              !hasVector && 'Activez pgvector dans le dashboard',
              !openAIInfo.in_env && 'Configurez OPENAI_API_KEY dans les secrets',
              results.some(r => r.status === 'failed') && 'Corrigez les erreurs ci-dessus'
            ].filter(Boolean)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})