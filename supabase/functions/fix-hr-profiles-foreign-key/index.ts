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
    console.log('🔧 CORRECTION CLÉS ÉTRANGÈRES HR_PROFILES')
    console.log('==========================================')

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

    // 2. Supprimer contrainte existante si elle existe
    console.log('🗑️ Suppression contrainte existante...')
    try {
      await supabaseClient.rpc('exec_sql', {
        sql: `
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
            ELSE
              RAISE NOTICE 'Aucune contrainte existante trouvée';
            END IF;
          END $$;
        `
      })
      console.log('✅ Contrainte existante supprimée (si elle existait)')
      results.push({ step: 'drop_constraint', success: true })
    } catch (dropError) {
      console.log('⚠️ Erreur suppression contrainte (normal si elle n\'existe pas):', dropError.message)
      results.push({ step: 'drop_constraint', success: true, note: 'Contrainte n\'existait pas' })
    }

    // 3. Ajouter la nouvelle contrainte
    console.log('🔧 Ajout nouvelle contrainte...')
    try {
      await supabaseClient.rpc('exec_sql', {
        sql: `
          ALTER TABLE hr_resource_assignments
          ADD CONSTRAINT fk_hr_resource_assignments_profile_id
          FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
          ON DELETE SET NULL ON UPDATE CASCADE;
        `
      })
      console.log('✅ Nouvelle contrainte ajoutée!')
      results.push({ step: 'add_constraint', success: true })
    } catch (addError) {
      console.error('❌ Erreur ajout contrainte:', addError.message)
      results.push({ step: 'add_constraint', success: false, error: addError.message })
      
      // Si l'ajout échoue, on retourne le résultat
      return new Response(JSON.stringify({
        success: false,
        message: 'Échec ajout contrainte: ' + addError.message,
        steps: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Test jointure APRÈS migration
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
          is_ai
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
