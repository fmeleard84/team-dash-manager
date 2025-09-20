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
    console.log('🔧 EXÉCUTION MIGRATION CLÉS ÉTRANGÈRES')
    console.log('=====================================')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = []

    // 1. Vérifier l'état actuel
    console.log('📋 Étape 1: Vérification état actuel...')
    const { data: currentState, error: stateError } = await supabaseClient
      .rpc('sql', {
        query: `
          SELECT
            'État actuel des contraintes:' as info,
            conname as constraint_name,
            contype as constraint_type,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = 'hr_resource_assignments'::regclass;
        `
      })

    if (stateError) {
      console.error('❌ Erreur vérification état:', stateError)
    } else {
      console.log('✅ État actuel vérifié')
      results.push({ step: 'current_state', success: true, data: currentState })
    }

    // 2. Vérifier intégrité des données
    console.log('📋 Étape 2: Vérification intégrité...')
    const { data: integrity, error: integrityError } = await supabaseClient
      .rpc('sql', {
        query: `
          SELECT
            COUNT(*) as total_assignments,
            COUNT(DISTINCT profile_id) as unique_profile_ids,
            COUNT(hra.profile_id) as assignments_with_profile_id
          FROM hr_resource_assignments hra;
        `
      })

    if (integrityError) {
      console.error('❌ Erreur vérification intégrité:', integrityError)
    } else {
      console.log('✅ Intégrité vérifiée')
      results.push({ step: 'integrity_check', success: true, data: integrity })
    }

    // 3. Vérifier références orphelines
    console.log('📋 Étape 3: Vérification références orphelines...')
    const { data: orphans, error: orphansError } = await supabaseClient
      .rpc('sql', {
        query: `
          SELECT
            COUNT(*) as orphaned_assignments
          FROM hr_resource_assignments hra
          LEFT JOIN hr_profiles hp ON hra.profile_id = hp.id
          WHERE hra.profile_id IS NOT NULL AND hp.id IS NULL;
        `
      })

    if (orphansError) {
      console.error('❌ Erreur vérification orphelins:', orphansError)
    } else {
      console.log('✅ Références orphelines vérifiées')
      results.push({ step: 'orphan_check', success: true, data: orphans })
    }

    // 4. Supprimer contrainte existante si elle existe
    console.log('🗑️ Étape 4: Suppression contrainte existante...')
    const { error: dropError } = await supabaseClient
      .rpc('sql', {
        query: `
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
      })

    if (dropError) {
      console.error('❌ Erreur suppression contrainte:', dropError)
      results.push({ step: 'drop_constraint', success: false, error: dropError.message })
    } else {
      console.log('✅ Contrainte existante supprimée (si elle existait)')
      results.push({ step: 'drop_constraint', success: true })
    }

    // 5. Ajouter la nouvelle contrainte
    console.log('🔧 Étape 5: Ajout nouvelle contrainte...')
    const { error: addError } = await supabaseClient
      .rpc('sql', {
        query: `
          ALTER TABLE hr_resource_assignments
          ADD CONSTRAINT fk_hr_resource_assignments_profile_id
          FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
          ON DELETE SET NULL ON UPDATE CASCADE;
        `
      })

    if (addError) {
      console.error('❌ Erreur ajout contrainte:', addError)
      results.push({ step: 'add_constraint', success: false, error: addError.message })
    } else {
      console.log('✅ Nouvelle contrainte ajoutée!')
      results.push({ step: 'add_constraint', success: true })
    }

    // 6. Vérifier que la contrainte a bien été ajoutée
    console.log('🔍 Étape 6: Vérification finale...')
    const { data: finalCheck, error: finalError } = await supabaseClient
      .rpc('sql', {
        query: `
          SELECT
            conname as constraint_name,
            contype as constraint_type,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = 'hr_resource_assignments'::regclass
          AND contype = 'f';
        `
      })

    if (finalError) {
      console.error('❌ Erreur vérification finale:', finalError)
      results.push({ step: 'final_check', success: false, error: finalError.message })
    } else {
      console.log('✅ Vérification finale réussie')
      results.push({ step: 'final_check', success: true, data: finalCheck })
    }

    // 7. Test de la jointure
    console.log('🧪 Étape 7: Test jointure...')
    const testJoin = await supabaseClient
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
      .limit(1)

    if (testJoin.error) {
      console.error('❌ Test jointure échoué:', testJoin.error)
      results.push({ step: 'join_test', success: false, error: testJoin.error.message })
    } else {
      console.log('🎉 Test jointure réussi!')
      results.push({ step: 'join_test', success: true, data: testJoin.data })
    }

    const allSuccessful = results.every(r => r.success)

    return new Response(JSON.stringify({
      success: allSuccessful,
      message: allSuccessful ?
        'Migration réussie! Les jointures directes fonctionnent maintenant.' :
        'Migration partiellement échouée. Vérifiez les détails.',
      steps: results,
      joinWorking: !testJoin.error
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