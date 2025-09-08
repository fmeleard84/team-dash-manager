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

    console.log('=== ANALYSE DES PROJETS ET ÉVÉNEMENTS ===')

    // 1. Chercher les projets 0832 et 0937
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .or('title.ilike.%0832%,title.ilike.%0937%')

    const results = {
      projects: [],
      events: [],
      attendees: {},
      analysis: {}
    }

    if (projects && projects.length > 0) {
      console.log(`Trouvé ${projects.length} projet(s)`)
      
      for (const project of projects) {
        const projectInfo = {
          id: project.id,
          title: project.title,
          status: project.status,
          owner_id: project.owner_id,
          team: []
        }

        // Récupérer l'équipe
        const { data: owner } = await supabase
          .from('client_profiles')
          .select('id, email, first_name, last_name')
          .eq('id', project.owner_id)
          .single()

        if (owner) {
          projectInfo.team.push({
            ...owner,
            role: 'client'
          })
        }

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
          .eq('project_id', project.id)

        if (assignments) {
          assignments.forEach(a => {
            if (a.candidate_profiles) {
              projectInfo.team.push({
                ...a.candidate_profiles,
                role: 'resource',
                booking_status: a.booking_status
              })
            }
          })
        }

        // Récupérer les événements
        const { data: events } = await supabase
          .from('project_events')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })

        if (events) {
          for (const event of events) {
            const eventInfo = {
              id: event.id,
              title: event.title,
              project_id: project.id,
              project_title: project.title,
              created_at: event.created_at,
              created_by: event.created_by,
              attendees: []
            }

            // Récupérer les participants
            const { data: attendees } = await supabase
              .from('project_event_attendees')
              .select('*')
              .eq('event_id', event.id)

            if (attendees) {
              eventInfo.attendees = attendees
              
              // Analyser les problèmes
              const issues = []
              
              attendees.forEach(att => {
                if (!att.user_id) {
                  issues.push(`Participant ${att.id} n'a pas de user_id`)
                } else {
                  // Vérifier si l'ID existe dans les profils
                  const teamMember = projectInfo.team.find(m => m.id === att.user_id)
                  if (!teamMember) {
                    issues.push(`user_id ${att.user_id} n'est pas dans l'équipe du projet`)
                  }
                }
              })
              
              if (issues.length > 0) {
                eventInfo.issues = issues
              }
            }

            results.events.push(eventInfo)
          }
        }

        results.projects.push(projectInfo)
      }
    }

    // Vérifier la structure de la table
    const { data: columns } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_event_attendees'
        ORDER BY ordinal_position;
      `
    })

    results.tableStructure = columns

    // Vérifier les policies RLS
    const { data: policies } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT polname, polcmd
        FROM pg_policies
        WHERE tablename = 'project_event_attendees';
      `
    })

    results.rlsPolicies = policies

    // Analyser le problème
    if (results.events.length > 0) {
      const eventsWithoutAttendees = results.events.filter(e => e.attendees.length === 0)
      const eventsWithIssues = results.events.filter(e => e.issues && e.issues.length > 0)
      
      results.analysis = {
        totalProjects: results.projects.length,
        totalEvents: results.events.length,
        eventsWithoutAttendees: eventsWithoutAttendees.length,
        eventsWithIssues: eventsWithIssues.length,
        possibleCauses: []
      }

      if (eventsWithoutAttendees.length > 0) {
        results.analysis.possibleCauses.push('Les participants ne sont pas enregistrés lors de la création')
      }
      
      if (eventsWithIssues.length > 0) {
        results.analysis.possibleCauses.push('Problème de correspondance des IDs universels')
      }

      if (!policies || policies.length === 0) {
        results.analysis.possibleCauses.push('Aucune policy RLS sur project_event_attendees')
      }
    }

    return new Response(
      JSON.stringify(results, null, 2),
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