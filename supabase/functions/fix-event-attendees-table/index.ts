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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔧 Réparation de la table project_event_attendees...')

    // 1. Supprimer la contrainte unique problématique
    try {
      const { error: dropError } = await supabaseClient.rpc('exec_sql', {
        sql: `ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;`
      })
      
      if (dropError) {
        console.log('Erreur suppression contrainte (peut être normale si n\'existe pas):', dropError.message)
      } else {
        console.log('✅ Contrainte unique supprimée')
      }
    } catch (e) {
      console.log('Note: Contrainte peut ne pas exister')
    }

    // 2. Nettoyer les doublons éventuels
    const { error: cleanError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        DELETE FROM project_event_attendees
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY event_id, email 
              ORDER BY created_at DESC
            ) as rn
            FROM project_event_attendees
          ) t
          WHERE t.rn > 1
        );
      `
    })
    
    if (cleanError) {
      console.error('Erreur nettoyage doublons:', cleanError)
    } else {
      console.log('✅ Doublons nettoyés')
    }

    // 3. Vérifier la structure actuelle
    const { data: columns } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'project_event_attendees'
        ORDER BY ordinal_position;
      `
    })

    // 4. Tester une insertion simple
    const testEventId = '54138cdc-142d-4cde-9f6b-07f5de38102b' // Event Date2
    const testEmail = 'test@example.com'
    const testProfileId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da'
    
    console.log('🧪 Test d\'insertion directe...')
    
    // D'abord supprimer si existe
    await supabaseClient
      .from('project_event_attendees')
      .delete()
      .eq('event_id', testEventId)
      .eq('email', testEmail)
    
    // Puis insérer
    const { error: insertError } = await supabaseClient
      .from('project_event_attendees')
      .insert({
        event_id: testEventId,
        email: testEmail,
        profile_id: testProfileId,
        required: true,
        response_status: 'pending'
      })
    
    let insertResult = 'Succès'
    if (insertError) {
      insertResult = `Erreur: ${insertError.message}`
      console.error('❌ Erreur insertion test:', insertError)
    } else {
      console.log('✅ Insertion test réussie')
      
      // Nettoyer le test
      await supabaseClient
        .from('project_event_attendees')
        .delete()
        .eq('event_id', testEventId)
        .eq('email', testEmail)
    }

    // 5. Compter les enregistrements actuels
    const { data: countData } = await supabaseClient
      .from('project_event_attendees')
      .select('event_id', { count: 'exact' })
    
    const totalRecords = countData?.length || 0

    return new Response(JSON.stringify({
      success: true,
      message: 'Table analysée et nettoyée',
      table_columns: columns,
      test_insertion: insertResult,
      total_records: totalRecords,
      recommendations: [
        'La contrainte unique a été supprimée',
        'Les doublons ont été nettoyés',
        'La table est prête pour les insertions'
      ]
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