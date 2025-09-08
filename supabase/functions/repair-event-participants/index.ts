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

    console.log('=== RÉPARATION DES PARTICIPANTS MANQUANTS ===')

    // 1. Récupérer tous les événements sans participants
    const { data: eventsWithoutAttendees } = await supabase
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
      .order('created_at', { ascending: false })

    const repairedEvents = []
    let totalParticipantsAdded = 0

    if (eventsWithoutAttendees && eventsWithoutAttendees.length > 0) {
      for (const event of eventsWithoutAttendees) {
        // Vérifier si l'événement a déjà des participants
        const { data: existingAttendees, error: checkError } = await supabase
          .from('project_event_attendees')
          .select('id')
          .eq('event_id', event.id)

        if (existingAttendees && existingAttendees.length > 0) {
          console.log(`Événement ${event.title} a déjà ${existingAttendees.length} participants`)
          continue
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
            }
          })
        }

        // Ajouter les participants
        if (teamMembers.length > 0) {
          const attendees = teamMembers.map(member => ({
            event_id: event.id,
            user_id: member.id,
            email: member.email,
            role: member.role,
            required: true,
            response_status: 'pending'
          }))

          // Supprimer les doublons potentiels
          const uniqueAttendees = attendees.filter((att, index, self) =>
            index === self.findIndex(a => a.user_id === att.user_id)
          )

          console.log(`Ajout de ${uniqueAttendees.length} participants à ${event.title}`)

          const { error: insertError } = await supabase
            .from('project_event_attendees')
            .insert(uniqueAttendees)

          if (insertError) {
            console.error(`Erreur ajout participants pour ${event.title}:`, insertError.message)
            repairedEvents.push({
              event: event.title,
              status: 'error',
              error: insertError.message
            })
          } else {
            totalParticipantsAdded += uniqueAttendees.length
            repairedEvents.push({
              event: event.title,
              status: 'success',
              participantsAdded: uniqueAttendees.length,
              participants: uniqueAttendees.map(a => ({
                name: teamMembers.find(m => m.id === a.user_id)?.first_name + ' ' + 
                      teamMembers.find(m => m.id === a.user_id)?.last_name,
                role: a.role
              }))
            })
          }
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
          attendeesCount: e.project_event_attendees?.length || 0
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