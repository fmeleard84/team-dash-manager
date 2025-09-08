import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('=== APPLICATION CONTRAINTE UNIQUE NULLS NOT DISTINCT ===')
    
    const results = {
      steps: [],
      success: false
    }

    // 1. Supprimer les doublons existants
    console.log('1. Suppression des doublons...')
    await supabase.rpc('exec_sql', {
      sql: `
        DELETE FROM project_event_attendees a
        WHERE a.id > (
          SELECT MIN(b.id)
          FROM project_event_attendees b
          WHERE b.event_id = a.event_id 
          AND (b.user_id = a.user_id OR (b.user_id IS NULL AND a.user_id IS NULL))
          AND (b.email = a.email OR (b.email IS NULL AND a.email IS NULL))
        );
      `
    })
    results.steps.push({ step: 'remove_duplicates', success: true })

    // 2. Supprimer toutes les anciennes contraintes
    console.log('2. Suppression des anciennes contraintes...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;
        
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;
      `
    })
    results.steps.push({ step: 'drop_old_constraints', success: true })

    // 3. Créer la nouvelle contrainte UNIQUE NULLS NOT DISTINCT
    console.log('3. Création de la contrainte UNIQUE NULLS NOT DISTINCT...')
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_user_unique 
        UNIQUE NULLS NOT DISTINCT (event_id, user_id);
      `
    })

    if (constraintError) {
      console.error('Erreur création contrainte:', constraintError)
      results.steps.push({ 
        step: 'create_constraint', 
        success: false, 
        error: constraintError.message 
      })
    } else {
      results.steps.push({ step: 'create_constraint', success: true })
      results.success = true
    }

    // 4. Créer aussi une contrainte pour email quand user_id est NULL
    console.log('4. Création contrainte pour email...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_event_email_when_no_user 
        ON project_event_attendees(event_id, email) 
        WHERE user_id IS NULL;
      `
    })
    results.steps.push({ step: 'create_email_index', success: true })

    // 5. Test d'insertion
    console.log('5. Test d\'insertion...')
    
    // Récupérer un projet pour le test
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single()

    if (project) {
      // Créer un événement de test
      const { data: event } = await supabase
        .from('project_events')
        .insert({
          project_id: project.id,
          title: 'Test Constraint Event',
          start_at: new Date().toISOString(),
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single()

      if (event) {
        // Test insertion avec email seul
        const { error: emailTest } = await supabase
          .from('project_event_attendees')
          .insert({
            event_id: event.id,
            email: 'test-constraint@example.com',
            role: 'participant',
            required: true,
            response_status: 'pending'
          })

        results.steps.push({ 
          step: 'test_email_insert', 
          success: !emailTest,
          error: emailTest?.message
        })

        // Nettoyer
        await supabase.from('project_event_attendees').delete().eq('event_id', event.id)
        await supabase.from('project_events').delete().eq('id', event.id)
      }
    }

    return new Response(
      JSON.stringify({
        ...results,
        message: results.success 
          ? '✅ Contrainte UNIQUE NULLS NOT DISTINCT appliquée avec succès!'
          : '❌ Erreur lors de l\'application de la contrainte'
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: results.success ? 200 : 500
      }
    )

  } catch (error: any) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
