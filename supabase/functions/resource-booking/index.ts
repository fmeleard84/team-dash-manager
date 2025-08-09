import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    const { projectId, action, candidateId, resourceAssignmentId } = requestBody

    console.log('Request received:', { action, projectId, candidateId, resourceAssignmentId })

    if (action === 'find_candidates') {
      return await findCandidatesForProject(supabase, projectId)
    } else if (action === 'accept_mission') {
      if (!candidateId || !resourceAssignmentId) {
        throw new Error('candidateId and resourceAssignmentId are required for accept_mission')
      }
      return await acceptMission(supabase, candidateId, resourceAssignmentId, projectId)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function findCandidatesForProject(supabase: any, projectId: string) {
  // Get project details and resource assignments
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) throw new Error(`Project not found: ${projectError.message}`)

  // Get resource assignments for this project
  const { data: resourceAssignments, error: resourceError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        category_id,
        hr_categories (name)
      )
    `)
    .eq('project_id', projectId)
    .eq('booking_status', 'recherche')

  if (resourceError) throw new Error(`Resource assignments error: ${resourceError.message}`)

  let notificationsSent = 0

  for (const assignment of resourceAssignments) {
    // Find matching candidates based on exact profile match AND availability status
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidate_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        seniority,
        profile_id,
        status,
        candidate_languages (
          language_id,
          hr_languages (code, name)
        ),
        candidate_expertises (
          expertise_id,
          hr_expertises (id, name)
        )
      `)
      .eq('profile_id', assignment.profile_id)
      .eq('seniority', assignment.seniority)
      .eq('is_email_verified', true)
      .eq('status', 'disponible')

    if (candidatesError) {
      console.error('Candidates error:', candidatesError)
      continue
    }

    // Filter candidates by languages and expertises
    const filteredCandidates = candidates.filter(candidate => {
      // Check languages match - compare by language names, not codes
      const candidateLanguages = candidate.candidate_languages.map(cl => cl.hr_languages.name)
      const requiredLanguages = assignment.languages || []
      const hasRequiredLanguages = requiredLanguages.every(lang => candidateLanguages.includes(lang))

      // Check expertises match
      const candidateExpertises = candidate.candidate_expertises.map(ce => ce.hr_expertises.name)
      const requiredExpertises = assignment.expertises || []
      const hasRequiredExpertises = requiredExpertises.every(exp => candidateExpertises.includes(exp))

      // Debug logging
      console.log(`Candidate ${candidate.first_name} ${candidate.last_name}:`)
      console.log(`  Languages: ${candidateLanguages.join(', ')} | Required: ${requiredLanguages.join(', ')} | Match: ${hasRequiredLanguages}`)
      console.log(`  Expertises: ${candidateExpertises.join(', ')} | Required: ${requiredExpertises.join(', ')} | Match: ${hasRequiredExpertises}`)

      return hasRequiredLanguages && hasRequiredExpertises
    })

    // Send notifications to matching candidates
    for (const candidate of filteredCandidates) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from('candidate_notifications')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('resource_assignment_id', assignment.id)
        .eq('status', 'unread')
        .single()

      if (!existingNotification) {
        // Create notification
        const { error: notificationError } = await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: candidate.id,
            project_id: projectId,
            resource_assignment_id: assignment.id,
            title: `Nouveau projet: ${project.title}`,
            description: `Poste: ${assignment.hr_profiles.name}\nDescription: ${project.description || 'Pas de description'}`
          })

        if (!notificationError) {
          notificationsSent++
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `${notificationsSent} notifications envoyées aux candidats`,
      notificationsSent 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function acceptMission(supabase: any, candidateId: string, resourceAssignmentId: string, projectId: string) {
  // Check if resource is still available (atomic check)
  const { data: assignment, error: assignmentError } = await supabase
    .from('hr_resource_assignments')
    .select('booking_status')
    .eq('id', resourceAssignmentId)
    .single()

  if (assignmentError) throw new Error(`Assignment not found: ${assignmentError.message}`)

  if (assignment.booking_status !== 'recherche') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Ce poste a déjà été pourvu par un autre candidat' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update assignment status to booked
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({ booking_status: 'booké' })
    .eq('id', resourceAssignmentId)

  if (updateError) throw new Error(`Update error: ${updateError.message}`)

  // Create booking record
  const { error: bookingError } = await supabase
    .from('project_bookings')
    .insert({
      project_id: projectId,
      resource_assignment_id: resourceAssignmentId,
      candidate_id: candidateId,
      status: 'accepted'
    })

  if (bookingError) throw new Error(`Booking error: ${bookingError.message}`)

  // Expire all other notifications for this resource assignment
  await supabase
    .from('candidate_notifications')
    .update({ status: 'expired' })
    .eq('resource_assignment_id', resourceAssignmentId)
    .neq('candidate_id', candidateId)

  // Mark current candidate's notification as read
  await supabase
    .from('candidate_notifications')
    .update({ status: 'read' })
    .eq('resource_assignment_id', resourceAssignmentId)
    .eq('candidate_id', candidateId)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Mission acceptée avec succès!' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}