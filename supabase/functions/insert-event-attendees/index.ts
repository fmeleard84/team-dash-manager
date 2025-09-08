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
    const { eventId, attendees } = await req.json()
    
    // Utiliser SERVICE_ROLE_KEY pour bypasser RLS
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

    console.log(`📥 Insertion des participants pour l'événement ${eventId}`)
    console.log('Participants:', attendees)

    const results = []
    
    for (const attendee of attendees) {
      try {
        // Vérifier d'abord si l'entrée existe déjà
        const { data: existing, error: checkError } = await supabaseClient
          .from('project_event_attendees')
          .select('id')
          .eq('event_id', eventId)
          .eq('email', attendee.email)
          .maybeSingle()

        if (checkError) {
          console.error(`Erreur vérification pour ${attendee.email}:`, checkError)
        }

        if (existing) {
          console.log(`✅ Participant ${attendee.email} déjà présent`)
          results.push({ email: attendee.email, status: 'already_exists' })
        } else {
          // Construire les données à insérer
          const insertData: any = {
            event_id: eventId,
            email: attendee.email,
            required: attendee.required ?? true,
            response_status: attendee.response_status ?? 'pending'
          }
          
          // Ajouter profile_id s'il est fourni
          if (attendee.profile_id) {
            insertData.profile_id = attendee.profile_id
            console.log(`👤 Insertion avec profile_id: ${attendee.profile_id} pour ${attendee.email}`)
          } else {
            console.log(`📧 Insertion sans profile_id pour ${attendee.email}`)
          }
          
          // Utiliser l'API REST directement pour éviter le problème ON CONFLICT du client JS
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/project_event_attendees`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(insertData)
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Participant ${attendee.email} ajouté avec succès`)
            results.push({ 
              email: attendee.email, 
              status: 'inserted', 
              profile_id: attendee.profile_id,
              id: data[0]?.id
            })
          } else {
            const errorText = await response.text()
            console.error(`❌ Erreur API pour ${attendee.email}:`, errorText)
            results.push({ 
              email: attendee.email, 
              status: 'error', 
              error: errorText 
            })
          }
        }
      } catch (error) {
        console.error(`Erreur inattendue pour ${attendee.email}:`, error)
        results.push({ email: attendee.email, status: 'error', error: error.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
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