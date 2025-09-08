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
    // Utiliser SERVICE_ROLE pour bypasser RLS
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

    console.log('🔍 Diagnostic des événements et participants...')

    // 1. Récupérer les 10 derniers événements
    const { data: events, error: eventsError } = await supabaseClient
      .from('project_events')
      .select(`
        id,
        title,
        start_at,
        created_at,
        created_by,
        project_id
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (eventsError) {
      console.error('❌ Erreur récupération événements:', eventsError)
      throw eventsError
    }

    const results = []
    
    for (const event of events || []) {
      const startDate = new Date(event.start_at)
      
      // 2. Récupérer les participants pour chaque événement
      const { data: attendees, error: attendeesError } = await supabaseClient
        .from('project_event_attendees')
        .select('*')
        .eq('event_id', event.id)
      
      // 3. Récupérer le projet
      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, owner_id')
        .eq('id', event.project_id)
        .single()
      
      // 4. Récupérer les membres du projet
      const { data: assignments } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          candidate_id,
          booking_status,
          candidate_profiles (
            email,
            first_name,
            last_name
          )
        `)
        .eq('project_id', event.project_id)
        .eq('booking_status', 'accepted')
      
      results.push({
        event: {
          id: event.id,
          title: event.title,
          date: startDate.toLocaleDateString('fr-FR'),
          time: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          created_at: new Date(event.created_at).toLocaleString('fr-FR'),
          created_by: event.created_by
        },
        project: project ? project.title : 'N/A',
        participants: {
          count: attendees?.length || 0,
          list: attendees?.map(a => ({
            email: a.email,
            status: a.response_status,
            id: a.id
          })) || []
        },
        team_members: assignments?.map(a => ({
          email: a.candidate_profiles?.email,
          name: a.candidate_profiles ? `${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}` : 'N/A'
        })) || [],
        error: attendeesError?.message
      })
    }

    // 5. Rechercher spécifiquement les événements avec "Date" dans le titre
    const { data: dateEvents } = await supabaseClient
      .from('project_events')
      .select(`
        id,
        title,
        start_at,
        project_event_attendees(*)
      `)
      .ilike('title', '%date%')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return new Response(JSON.stringify({
      success: true,
      recent_events: results,
      date_events: dateEvents?.map(e => ({
        id: e.id,
        title: e.title,
        date: new Date(e.start_at).toLocaleDateString('fr-FR'),
        participants_count: e.project_event_attendees?.length || 0
      })),
      total_events_checked: events?.length || 0
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