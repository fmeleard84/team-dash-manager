import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer le candidat spécifique
    const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com'
    
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', candidateEmail)
      .single()

    // Récupérer le projet
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', '%Projet 27_08%')
      .single()

    if (!candidate || !project) {
      return new Response(
        JSON.stringify({ error: 'Candidate or project not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier les assignments
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (name)
      `)
      .eq('project_id', project.id)

    // Chercher l'assignment qui correspond
    const matchingAssignment = assignments?.find(a => 
      a.profile_id === candidate.profile_id && 
      a.seniority === candidate.seniority
    )

    // Vérifier les notifications
    const { data: notifications } = await supabase
      .from('candidate_notifications')
      .select('*')
      .eq('candidate_id', candidate.id)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    // Vérifier les transitions
    const { data: transitions } = await supabase
      .from('resource_transitions')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5)

    const result = {
      candidate: {
        id: candidate.id,
        email: candidate.email,
        profile_id: candidate.profile_id,
        seniority: candidate.seniority,
        status: candidate.status
      },
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      },
      matching_assignment: matchingAssignment ? {
        id: matchingAssignment.id,
        booking_status: matchingAssignment.booking_status,
        profile_name: matchingAssignment.hr_profiles?.name,
        current_candidate_id: matchingAssignment.current_candidate_id,
        modification_in_progress: matchingAssignment.modification_in_progress
      } : null,
      all_assignments: assignments?.map(a => ({
        profile_id: a.profile_id,
        seniority: a.seniority,
        booking_status: a.booking_status,
        profile_name: a.hr_profiles?.name
      })),
      notifications: notifications?.map(n => ({
        id: n.id,
        status: n.status,
        type: n.type,
        created_at: n.created_at,
        title: n.title
      })),
      recent_transitions: transitions?.map(t => ({
        id: t.id,
        type: t.transition_type,
        status: t.status,
        previous_seniority: t.previous_seniority,
        new_seniority: t.new_seniority,
        created_at: t.created_at
      })),
      SHOULD_SEE_PROJECT: matchingAssignment?.booking_status === 'recherche',
      HAS_UNREAD_NOTIFICATION: notifications?.some(n => n.status === 'unread')
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})