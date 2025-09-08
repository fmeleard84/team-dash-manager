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

    console.log('=== RÉPARATION SIMPLE DES PARTICIPANTS ===')

    const repairedEvents = []
    let totalParticipantsAdded = 0

    // Récupérer les événements des projets 0832 et 0937
    const { data: targetEvents } = await supabase
      .from('project_events')
      .select(`
        id,
        title,
        project_id,
        created_by,
        projects (
          id,
          title,
          owner_id
        )
      `)
      .or('title.ilike.%0832%,title.ilike.%0937%')

    if (targetEvents && targetEvents.length > 0) {
      for (const event of targetEvents) {
        console.log(`\nTraitement de: ${event.title}`)
        
        // Supprimer les participants existants pour cet événement
        const { error: deleteError } = await supabase
          .from('project_event_attendees')
          .delete()
          .eq('event_id', event.id)
        
        if (deleteError) {
          console.log('Erreur suppression:', deleteError.message)
        }

        // Récupérer l'équipe du projet
        const teamMembers = []

        // Ajouter le client (owner)
        if (event.projects?.owner_id) {
          const { data: client } = await supabase
            .from('client_profiles')
            .select('id, email, first_name, last_name')
            .eq('id', event.projects.owner_id)
            .single()

          if (client) {
            teamMembers.push({
              ...client,
              role: 'client'
            })
            console.log(`  Client trouvé: ${client.first_name} ${client.last_name}`)
          }
        }

        // Ajouter les candidats acceptés
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            candidate_id,
            booking_status,
            candidate_profiles (
              id,
              email,
              first_name,
              last_name
            )
          `)
          .eq('project_id', event.project_id)
          .eq('booking_status', 'accepted')

        if (assignments) {
          assignments.forEach(a => {
            if (a.candidate_profiles) {
              teamMembers.push({
                ...a.candidate_profiles,
                role: 'resource'
              })
              console.log(`  Candidat trouvé: ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}`)
            }
          })
        }

        // Ajouter les nouveaux participants
        if (teamMembers.length > 0) {
          const attendees = teamMembers.map(member => ({
            event_id: event.id,
            user_id: member.id,
            email: member.email,
            role: member.role,
            required: true,
            response_status: 'pending'
          }))

          console.log(`  Ajout de ${attendees.length} participants`)

          // Insertion simple sans ON CONFLICT
          const { data: inserted, error: insertError } = await supabase
            .from('project_event_attendees')
            .insert(attendees)
            .select()

          if (insertError) {
            console.error(`  ❌ Erreur:`, insertError.message)
            repairedEvents.push({
              event: event.title,
              status: 'error',
              error: insertError.message
            })
          } else {
            console.log(`  ✅ Succès:`, inserted?.length, 'participants ajoutés')
            totalParticipantsAdded += inserted?.length || 0
            repairedEvents.push({
              event: event.title,
              status: 'success',
              participantsAdded: inserted?.length || 0,
              participants: teamMembers.map(m => ({
                name: `${m.first_name} ${m.last_name}`,
                role: m.role,
                id: m.id
              }))
            })
          }
        } else {
          console.log(`  ⚠️ Aucun membre d'équipe trouvé`)
          repairedEvents.push({
            event: event.title,
            status: 'skipped',
            reason: 'No team members found'
          })
        }
      }
    }

    // Vérification finale
    const { data: finalCheck } = await supabase
      .from('project_events')
      .select(`
        id,
        title,
        project_event_attendees (
          id,
          user_id,
          email,
          role,
          response_status
        )
      `)
      .or('title.ilike.%0832%,title.ilike.%0937%')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Réparation terminée. ${totalParticipantsAdded} participants ajoutés.`,
        repairedEvents,
        verification: finalCheck?.map(e => ({
          title: e.title,
          attendeesCount: e.project_event_attendees?.length || 0,
          attendees: e.project_event_attendees?.map(a => ({
            user_id: a.user_id,
            email: a.email,
            role: a.role,
            status: a.response_status
          }))
        }))
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

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