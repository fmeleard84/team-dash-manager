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

    console.log('=== TEST INSERTION PARTICIPANTS ===')
    
    const results = {
      tests: [],
      success: false
    }

    // D'abord, récupérer un projet existant
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .limit(1)
      .single()

    if (!projects) {
      results.tests.push({
        name: 'no_project',
        error: 'Aucun projet trouvé'
      })
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`Utilisation du projet: ${projects.title}`)

    // Créer un événement de test
    const { data: event, error: eventError } = await supabase
      .from('project_events')
      .insert({
        project_id: projects.id,
        title: 'Test Event for Attendees',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        created_by: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single()

    if (eventError) {
      results.tests.push({
        name: 'create_event',
        error: eventError.message
      })
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`Événement créé: ${event.id}`)

    // Test 1: Insertion simple avec user_id
    console.log('Test 1: Insertion avec user_id...')
    const testUserId = '22222222-2222-2222-2222-222222222222'
    
    const { data: insert1, error: error1 } = await supabase
      .from('project_event_attendees')
      .insert({
        event_id: event.id,
        user_id: testUserId,
        email: 'test@example.com',
        role: 'participant',
        required: true,
        response_status: 'pending'
      })

    results.tests.push({
      name: 'insertion_avec_user_id',
      success: !error1,
      error: error1?.message
    })

    // Test 2: Insertion duplicate (devrait causer ON CONFLICT)
    console.log('Test 2: Test doublon...')
    const { error: error2 } = await supabase
      .from('project_event_attendees')
      .insert({
        event_id: event.id,
        user_id: testUserId,
        email: 'test2@example.com',
        role: 'participant',
        required: true,
        response_status: 'accepted'
      })

    results.tests.push({
      name: 'test_doublon',
      hasError: !!error2,
      errorCode: error2?.code,
      error: error2?.message
    })

    // Test 3: Insertion avec email seulement (sans user_id)
    console.log('Test 3: Insertion avec email seulement...')
    const { error: error3 } = await supabase
      .from('project_event_attendees')
      .insert({
        event_id: event.id,
        email: 'emailonly@example.com',
        role: 'participant',
        required: true,
        response_status: 'pending'
      })

    results.tests.push({
      name: 'insertion_email_only',
      success: !error3,
      error: error3?.message
    })

    // Test 4: Vérifier les participants insérés
    const { data: attendees } = await supabase
      .from('project_event_attendees')
      .select('*')
      .eq('event_id', event.id)

    results.tests.push({
      name: 'participants_inseres',
      count: attendees?.length || 0,
      attendees: attendees
    })

    // Nettoyer
    await supabase
      .from('project_event_attendees')
      .delete()
      .eq('event_id', event.id)

    await supabase
      .from('project_events')
      .delete()
      .eq('id', event.id)

    results.success = true

    return new Response(
      JSON.stringify(results, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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
