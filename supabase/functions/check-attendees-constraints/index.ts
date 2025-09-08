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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Vérification de la table project_event_attendees...')

    // 1. Vérifier la structure de la table
    const { data: tableInfo } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'project_event_attendees' 
        ORDER BY ordinal_position;
      `
    })

    // 2. Vérifier les contraintes
    const { data: constraints } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_name = kcu.table_name
        WHERE tc.table_name = 'project_event_attendees'
        ORDER BY tc.constraint_name;
      `
    })

    // 3. Vérifier spécifiquement la contrainte unique
    const { data: uniqueConstraint } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
          conname as constraint_name,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint 
        WHERE conrelid = 'project_event_attendees'::regclass
        AND contype = 'u';
      `
    })

    // 4. Test d'insertion pour vérifier le comportement
    // Utiliser un event_id qui existe vraiment
    const testEventId = '54138cdc-142d-4cde-9f6b-07f5de38102b' // Event Date2
    const testEmail = `test-${Date.now()}@example.com`
    
    console.log(`🧪 Test insertion avec event_id existant: ${testEventId}`)
    
    // Premier insert - devrait réussir
    const { error: firstInsert } = await supabaseClient
      .from('project_event_attendees')
      .insert({
        event_id: testEventId,
        email: testEmail,
        required: true,
        response_status: 'pending'
      })

    let firstInsertResult = firstInsert ? `Erreur: ${firstInsert.message}` : 'Succès'
    
    // Deuxième insert identique - devrait échouer si contrainte unique existe
    const { error: secondInsert } = await supabaseClient
      .from('project_event_attendees')
      .insert({
        event_id: testEventId,
        email: testEmail,
        required: true,
        response_status: 'pending'
      })

    let secondInsertResult = secondInsert ? `Erreur: ${secondInsert.message}` : 'Succès (PROBLÈME - devrait échouer!)'

    // Nettoyer les données de test
    await supabaseClient
      .from('project_event_attendees')
      .delete()
      .eq('email', testEmail)

    return new Response(JSON.stringify({
      success: true,
      table_structure: tableInfo,
      constraints: constraints,
      unique_constraints: uniqueConstraint,
      insertion_tests: {
        first_insert: firstInsertResult,
        second_insert: secondInsertResult
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})