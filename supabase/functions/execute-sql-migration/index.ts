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
    console.log('🔧 EXÉCUTION MIGRATION SQL DIRECTE')
    console.log('=================================')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = []

    // 1. Test jointure AVANT migration
    console.log('🧪 Test jointure AVANT migration...')
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

    results.push({
      step: 'test_before',
      success: !testBefore.error,
      error: testBefore.error?.message,
      data: testBefore.data
    })

    console.log('Avant migration:', testBefore.error ? 'ÉCHEC' : 'SUCCÈS')

    // 2. Étape 1: Supprimer contrainte existante si elle existe
    console.log('🗑️ Suppression contrainte existante...')

    // Utiliser un client PostgreSQL direct via la libraiirie deno postgres
    const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')

    const dbConfig = {
      hostname: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.egdelmcijszuapcpglsy`,
      password: Deno.env.get('SUPABASE_DB_PASSWORD') ?? '',
      database: 'postgres',
    }

    const pool = new Pool(dbConfig, 1)

    try {
      // Supprimer la contrainte si elle existe
      const dropConstraintSQL = `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_hr_resource_assignments_profile_id'
            AND conrelid = 'hr_resource_assignments'::regclass
          ) THEN
            ALTER TABLE hr_resource_assignments
            DROP CONSTRAINT fk_hr_resource_assignments_profile_id;
            RAISE NOTICE 'Contrainte existante supprimée';
          END IF;
        END $$;
      `

      await pool.query(dropConstraintSQL)
      console.log('✅ Contrainte existante supprimée (si elle existait)')
      results.push({ step: 'drop_constraint', success: true })

      // Ajouter la nouvelle contrainte
      console.log('🔧 Ajout nouvelle contrainte...')
      const addConstraintSQL = `
        ALTER TABLE hr_resource_assignments
        ADD CONSTRAINT fk_hr_resource_assignments_profile_id
        FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
      `

      await pool.query(addConstraintSQL)
      console.log('✅ Nouvelle contrainte ajoutée!')
      results.push({ step: 'add_constraint', success: true })

      // Vérifier la contrainte
      const checkSQL = `
        SELECT
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'hr_resource_assignments'::regclass
        AND contype = 'f';
      `

      const constraintCheck = await pool.query(checkSQL)
      console.log('✅ Contrainte vérifiée:', constraintCheck.rows.length, 'contrainte(s)')
      results.push({
        step: 'verify_constraint',
        success: true,
        data: constraintCheck.rows
      })

    } catch (sqlError) {
      console.error('❌ Erreur SQL:', sqlError)
      results.push({
        step: 'sql_execution',
        success: false,
        error: sqlError.message
      })
    } finally {
      await pool.end()
    }

    // 3. Test jointure APRÈS migration
    console.log('🧪 Test jointure APRÈS migration...')
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

    results.push({
      step: 'test_after',
      success: !testAfter.error,
      error: testAfter.error?.message,
      data: testAfter.data
    })

    console.log('Après migration:', testAfter.error ? 'ÉCHEC' : 'SUCCÈS')

    if (!testAfter.error) {
      console.log('🎉 MIGRATION RÉUSSIE! Les jointures directes fonctionnent!')
    }

    const migrationSuccessful = !testAfter.error

    return new Response(JSON.stringify({
      success: migrationSuccessful,
      message: migrationSuccessful ?
        'Migration réussie! Les jointures directes fonctionnent maintenant.' :
        'Migration échouée. Vérifiez les logs.',
      steps: results,
      joinWorking: !testAfter.error,
      sampleData: testAfter.data
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