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
    
    console.log('🔧 Application directe de la migration RLS...')

    // Se connecter à la base de données
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Appliquer les commandes SQL une par une
      const commands = [
        'ALTER TABLE prompts_ia DISABLE ROW LEVEL SECURITY',
        'DROP POLICY IF EXISTS "prompts_ia_select_policy" ON prompts_ia',
        'DROP POLICY IF EXISTS "prompts_ia_insert_policy" ON prompts_ia',
        'DROP POLICY IF EXISTS "prompts_ia_update_policy" ON prompts_ia',
        'DROP POLICY IF EXISTS "prompts_ia_delete_policy" ON prompts_ia',
        'DROP POLICY IF EXISTS "prompts_ia_public_read" ON prompts_ia',
        'DROP POLICY IF EXISTS "prompts_ia_admin_all" ON prompts_ia',
        'DROP POLICY IF EXISTS "allow_public_read" ON prompts_ia',
        'DROP POLICY IF EXISTS "allow_admin_all" ON prompts_ia',
        `CREATE POLICY "allow_public_read" ON prompts_ia FOR SELECT USING (true)`,
        `CREATE POLICY "allow_admin_all" ON prompts_ia FOR ALL USING (EXISTS (SELECT 1 FROM client_profiles WHERE client_profiles.id = auth.uid()))`,
        'ALTER TABLE prompts_ia ENABLE ROW LEVEL SECURITY'
      ]

      for (const cmd of commands) {
        console.log(`Exécution: ${cmd.substring(0, 50)}...`)
        await client.queryArray(cmd)
      }

      console.log('✅ Migration appliquée avec succès')
      
      // Vérifier que les prompts sont maintenant visibles
      const adminClient = createClient(supabaseUrl, supabaseServiceKey)
      const { data: prompts } = await adminClient
        .from('prompts_ia')
        .select('id, name, active')
      
      console.log(`✅ ${prompts?.length || 0} prompts dans la base`)

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Migration RLS appliquée avec succès',
          prompts_count: prompts?.length || 0
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