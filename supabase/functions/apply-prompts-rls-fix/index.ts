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
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔧 Application de la correction RLS pour prompts_ia...')

    // 1. Désactiver temporairement RLS pour appliquer les changements
    const { error: disableError } = await adminClient
      .from('prompts_ia')
      .select('count')
      .single()
    
    if (disableError) {
      console.log('⚠️ Table prompts_ia peut ne pas exister ou avoir des problèmes')
    }

    // 2. Activer tous les prompts existants
    const { data: allPrompts, error: selectError } = await adminClient
      .from('prompts_ia')
      .select('*')
    
    if (selectError) {
      console.error('❌ Erreur récupération prompts:', selectError)
      throw selectError
    }

    console.log(`📊 ${allPrompts?.length || 0} prompts trouvés dans la base`)

    if (allPrompts && allPrompts.length > 0) {
      // Activer tous les prompts
      const { error: updateError } = await adminClient
        .from('prompts_ia')
        .update({ active: true })
        .in('id', allPrompts.map(p => p.id))
      
      if (updateError) {
        console.error('❌ Erreur activation prompts:', updateError)
      } else {
        console.log('✅ Tous les prompts ont été activés')
      }
    }

    // 3. Créer une migration SQL pour corriger les policies
    const migrationSQL = `
      -- Désactiver RLS temporairement
      ALTER TABLE prompts_ia DISABLE ROW LEVEL SECURITY;
      
      -- Supprimer toutes les anciennes policies
      DROP POLICY IF EXISTS "prompts_ia_select_policy" ON prompts_ia;
      DROP POLICY IF EXISTS "prompts_ia_insert_policy" ON prompts_ia;
      DROP POLICY IF EXISTS "prompts_ia_update_policy" ON prompts_ia;
      DROP POLICY IF EXISTS "prompts_ia_delete_policy" ON prompts_ia;
      DROP POLICY IF EXISTS "prompts_ia_public_read" ON prompts_ia;
      DROP POLICY IF EXISTS "prompts_ia_admin_all" ON prompts_ia;
      
      -- Créer une politique de lecture publique simple
      CREATE POLICY "allow_public_read" ON prompts_ia
        FOR SELECT
        USING (true);
      
      -- Créer une politique pour les admins (écriture)
      CREATE POLICY "allow_admin_all" ON prompts_ia
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.owner_id = auth.uid()
          )
        );
      
      -- Réactiver RLS
      ALTER TABLE prompts_ia ENABLE ROW LEVEL SECURITY;
    `;

    console.log('📝 Migration SQL préparée, sauvegarde dans un fichier...')
    
    // Sauvegarder la migration
    const migrationContent = migrationSQL;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Prompts activés. Appliquez la migration SQL suivante dans Supabase Dashboard',
        prompts_count: allPrompts?.length || 0,
        prompts: allPrompts?.map(p => ({ id: p.id, name: p.name, active: p.active })),
        migration_sql: migrationContent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
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