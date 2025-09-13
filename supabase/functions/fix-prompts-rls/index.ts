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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Correction des RLS pour prompts_ia...')

    // 1. Supprimer les anciennes policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "prompts_ia_select_policy" ON prompts_ia;
        DROP POLICY IF EXISTS "prompts_ia_insert_policy" ON prompts_ia;
        DROP POLICY IF EXISTS "prompts_ia_update_policy" ON prompts_ia;
        DROP POLICY IF EXISTS "prompts_ia_delete_policy" ON prompts_ia;
      `
    })
    console.log('✅ Anciennes policies supprimées')

    // 2. Créer les nouvelles policies
    await supabase.rpc('exec_sql', {
      sql: `
        -- Lecture publique pour tous les utilisateurs (même anonymes)
        CREATE POLICY "prompts_ia_public_read" ON prompts_ia
          FOR SELECT
          USING (true);
        
        -- Écriture pour les admins uniquement
        CREATE POLICY "prompts_ia_admin_all" ON prompts_ia
          FOR ALL
          USING (
            auth.uid() IN (
              SELECT owner_id FROM client_profiles
              WHERE owner_id = auth.uid()
            )
          );
      `
    })
    console.log('✅ Nouvelles policies créées')

    // 3. Activer RLS si pas déjà fait
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE prompts_ia ENABLE ROW LEVEL SECURITY;
      `
    })
    console.log('✅ RLS activée')

    // 4. Vérifier les prompts
    const { data: prompts, error } = await supabase
      .from('prompts_ia')
      .select('*')
      .eq('active', true)
    
    console.log(`✅ ${prompts?.length || 0} prompts actifs trouvés`)

    // 5. Si aucun prompt, activer les existants
    if (!prompts || prompts.length === 0) {
      const { data: allPrompts } = await supabase
        .from('prompts_ia')
        .select('*')
      
      if (allPrompts && allPrompts.length > 0) {
        console.log(`🔄 Activation de ${allPrompts.length} prompts...`)
        await supabase
          .from('prompts_ia')
          .update({ active: true })
          .in('id', allPrompts.map(p => p.id))
        console.log('✅ Prompts activés')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS corrigées avec succès',
        prompts_count: prompts?.length || 0
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