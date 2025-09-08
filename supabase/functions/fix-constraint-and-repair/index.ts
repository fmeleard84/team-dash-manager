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

    console.log('=== CORRECTION CONTRAINTE ET RÉPARATION ===')

    // 1. Vérifier les contraintes existantes
    const { data: constraints } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT conname, contype
        FROM pg_constraint
        WHERE conrelid = 'project_event_attendees'::regclass;
      `
    })

    console.log('Contraintes existantes:', constraints)

    // 2. Supprimer toutes les contraintes UNIQUE potentiellement problématiques
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;
        
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;
        
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_profile_unique;
      `
    })

    // 3. Créer la bonne contrainte unique sur event_id + user_id
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Vérifier si la contrainte existe déjà
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'project_event_attendees_event_user_unique'
            AND conrelid = 'project_event_attendees'::regclass
          ) THEN
            ALTER TABLE project_event_attendees 
            ADD CONSTRAINT project_event_attendees_event_user_unique 
            UNIQUE(event_id, user_id);
          END IF;
        END $$;
      `
    })

    console.log('✅ Contrainte unique créée/vérifiée')

    // 4. Maintenant réparer les événements sans participants
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
        // Vérifier si l'événement a déjà des participants
        const { data: existingAttendees } = await supabase
          .from('project_event_attendees')
          .select('user_id')
          .eq('event_id', event.id)

        const existingUserIds = existingAttendees?.map(a => a.user_id) || []

        // Récupérer l'équipe du projet
        const teamMembers = []

        // Ajouter le client (owner)
        if (event.projects?.owner_id && !existingUserIds.includes(event.projects.owner_id)) {
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
            if (a.candidate_profiles && !existingUserIds.includes(a.candidate_id)) {
              teamMembers.push({
                ...a.candidate_profiles,
                role: 'resource'
              })
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

          console.log(`Ajout de ${attendees.length} participants à ${event.title}`)

          // Utiliser upsert maintenant que la contrainte est correcte
          const { data: inserted, error: insertError } = await supabase
            .from('project_event_attendees')
            .upsert(attendees, {
              onConflict: 'event_id,user_id',
              ignoreDuplicates: true
            })
            .select()

          if (insertError) {
            console.error(`Erreur ajout participants pour ${event.title}:`, insertError.message)
            repairedEvents.push({
              event: event.title,
              status: 'error',
              error: insertError.message
            })
          } else {
            totalParticipantsAdded += attendees.length
            repairedEvents.push({
              event: event.title,
              status: 'success',
              participantsAdded: attendees.length,
              participants: attendees.map(a => ({
                name: teamMembers.find(m => m.id === a.user_id)?.first_name + ' ' + 
                      teamMembers.find(m => m.id === a.user_id)?.last_name,
                role: a.role
              }))
            })
          }
        } else {
          repairedEvents.push({
            event: event.title,
            status: 'skipped',
            reason: existingAttendees?.length > 0 ? 'Already has participants' : 'No team members found'
          })
        }
      }
    }

    // 5. Vérification finale
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
        message: `Correction terminée. ${totalParticipantsAdded} participants ajoutés.`,
        repairedEvents,
        verification: finalCheck?.map(e => ({
          title: e.title,
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