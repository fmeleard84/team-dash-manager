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
    console.log('🔧 CORRECTION CLÉS ÉTRANGÈRES HR_PROFILES (Version Simple)')
    console.log('==========================================================')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Test jointure avant correction
    console.log('🧪 Test jointure AVANT correction...')
    const testBefore = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        hr_profiles (
          id,
          name,
          is_ai
        )
      `)
      .limit(1)

    console.log('Résultat AVANT:', {
      error: testBefore.error?.message,
      success: !testBefore.error,
      dataCount: testBefore.data?.length || 0
    })

    // 2. Exécuter la requête SQL via RPC pour ajouter la clé étrangère
    console.log('🔧 Ajout de la clé étrangère...')

    const migrationSql = `
      -- Supprimer la contrainte si elle existe déjà
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_hr_resource_assignments_profile_id'
        ) THEN
          ALTER TABLE hr_resource_assignments
          DROP CONSTRAINT fk_hr_resource_assignments_profile_id;
        END IF;
      END $$;

      -- Ajouter la nouvelle contrainte de clé étrangère
      ALTER TABLE hr_resource_assignments
      ADD CONSTRAINT fk_hr_resource_assignments_profile_id
      FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    `

    // Utiliser SQL direct via supabase
    const { data: migrationResult, error: migrationError } = await supabaseClient
      .rpc('execute_sql', { sql_query: migrationSql })

    if (migrationError) {
      console.error('❌ Erreur migration:', migrationError)

      // Essayer méthode alternative avec query unique
      console.log('🔄 Tentative méthode alternative...')

      const { error: altError } = await supabaseClient
        .from('hr_resource_assignments')
        .select('id')
        .limit(0) // Juste pour exécuter une requête

      console.log('Alternative error:', altError?.message)
    }

    // 3. Test jointure après correction
    console.log('🧪 Test jointure APRÈS tentative de correction...')
    const testAfter = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        booking_status,
        hr_profiles (
          id,
          name,
          is_ai,
          prompt_id
        )
      `)
      .limit(5)

    console.log('Résultat APRÈS:', {
      error: testAfter.error?.message,
      success: !testAfter.error,
      dataCount: testAfter.data?.length || 0
    })

    // 4. Si la jointure fonctionne maintenant, vérifier les données
    if (!testAfter.error && testAfter.data) {
      console.log('🎉 SUCCÈS! La jointure fonctionne!')
      console.log('Données exemple:', JSON.stringify(testAfter.data[0], null, 2))
    }

    return new Response(JSON.stringify({
      success: !testAfter.error,
      message: testAfter.error ?
        'Migration échouée - jointure toujours impossible' :
        'Migration réussie - jointure fonctionnelle!',
      details: {
        beforeMigration: {
          error: testBefore.error?.message,
          worked: !testBefore.error
        },
        afterMigration: {
          error: testAfter.error?.message,
          worked: !testAfter.error,
          dataCount: testAfter.data?.length || 0
        },
        migrationError: migrationError?.message,
        sampleData: testAfter.data?.[0] || null
      }
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