import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { acceptMission as acceptMissionFixed, declineMission, getCandidateMissions, expireOldMissions } from './mission-management-fixed.ts'

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
    const { projectId, action, candidateId, resourceAssignmentId, assignment_id, candidate_email, project_id } = requestBody

    console.log('Request received:', { action, projectId, candidateId, resourceAssignmentId, assignment_id, candidate_email, project_id })

    if (action === 'find_candidates') {
      return await findCandidatesForProject(supabase, projectId)
    } else if (action === 'accept_mission_by_project') {
      if (!project_id || !candidate_email) {
        throw new Error('project_id and candidate_email are required for accept_mission_by_project')
      }
      const result = await acceptMissionByProject(supabase, project_id, candidate_email)
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'accept_mission') {
      if (!assignment_id || !candidate_email) {
        throw new Error('assignment_id and candidate_email are required for accept_mission')
      }
      const result = await acceptMissionFixed(supabase, assignment_id, candidate_email)
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'decline_mission') {
      if (!assignment_id || !candidate_email) {
        throw new Error('assignment_id and candidate_email are required for decline_mission')
      }
      const result = await declineMission(supabase, assignment_id, candidate_email)
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'get_candidate_missions') {
      if (!candidate_email) {
        throw new Error('candidate_email is required for get_candidate_missions')
      }
      const result = await getCandidateMissions(supabase, candidate_email)
      return new Response(
        JSON.stringify({ missions: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'expire_old_missions') {
      await expireOldMissions(supabase)
      return new Response(
        JSON.stringify({ success: true, message: 'Old missions expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
    .select('*')
    .eq('project_id', projectId)
    .eq('booking_status', 'recherche')

  if (resourceError) throw new Error(`Resource assignments error: ${resourceError.message}`)

  let notificationsSent = 0

  for (const assignment of resourceAssignments) {
    // Fetch hr_profile data separately
    const { data: hrProfile } = await supabase
      .from('hr_profiles')
      .select('id, name, category_id')
      .eq('id', assignment.profile_id)
      .single()
    
    // Add hr_profiles to assignment for backward compatibility
    assignment.hr_profiles = hrProfile
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
        qualification_status,
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
      .or('is_email_verified.eq.true,keycloak_user_id.not.is.null')
      .neq('status', 'qualification')  // Candidate must NOT be in qualification
      .in('status', ['disponible', 'en_pause'])  // Accept disponible or en_pause candidates

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
      console.log(`Candidate ${candidate.first_name} ${candidate.last_name} (${candidate.email}):`)
      console.log(`  Status: ${candidate.status}, Qualification: ${candidate.qualification_status}`)
      console.log(`  Languages: ${candidateLanguages.join(', ')} | Required: ${requiredLanguages.join(', ')} | Match: ${hasRequiredLanguages}`)
      console.log(`  Expertises: ${candidateExpertises.join(', ')} | Required: ${requiredExpertises.join(', ')} | Match: ${hasRequiredExpertises}`)
      console.log(`  Final match: ${hasRequiredLanguages && hasRequiredExpertises}`)

      return hasRequiredLanguages && hasRequiredExpertises
    })

    // Send notifications to matching candidates
    for (const candidate of filteredCandidates) {
      // Check if an UNREAD notification already exists for this specific assignment
      // Important: We only check for unread status to allow re-notification after accept/decline
      const { data: existingNotification } = await supabase
        .from('candidate_notifications')
        .select('id, status')
        .eq('candidate_id', candidate.id)
        .eq('resource_assignment_id', assignment.id)
        .eq('status', 'unread')
        .single()

      // Also check if candidate previously declined this specific assignment
      // If they declined before, we shouldn't re-notify them
      const { data: previouslyDeclined } = await supabase
        .from('candidate_notifications')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('resource_assignment_id', assignment.id)
        .eq('status', 'declined')
        .single()

      // Only create notification if:
      // 1. No unread notification exists AND
      // 2. Candidate hasn't previously declined this assignment
      if (!existingNotification && !previouslyDeclined) {
        // Create notification
        const { error: notificationError } = await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: candidate.id,
            project_id: projectId,
            resource_assignment_id: assignment.id,
            title: `Nouveau projet: ${project.title}`,
            description: `Poste: ${assignment.hr_profiles.name}\nDescription: ${project.description || 'Pas de description'}`,
            status: 'unread'
          })

        if (!notificationError) {
          notificationsSent++
          console.log(`Notification sent to candidate ${candidate.email} for assignment ${assignment.id}`)
        } else {
          console.log(`Failed to create notification for candidate ${candidate.email}:`, notificationError.message)
        }
      } else if (existingNotification) {
        console.log(`Notification already exists for candidate ${candidate.email}`)
      } else if (previouslyDeclined) {
        console.log(`Candidate ${candidate.email} previously declined this assignment, skipping`)
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

async function acceptMissionByProject(supabase: any, project_id: string, candidate_email: string) {
  console.log('acceptMissionByProject called with:', { project_id, candidate_email });
  
  // First find the candidate's profile info
  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('id, profile_id, seniority, first_name, last_name')
    .eq('email', candidate_email)
    .single();

  if (candidateError || !candidateProfile) {
    throw new Error(`Candidate profile not found for email: ${candidate_email}`);
  }

  console.log('Found candidate profile:', candidateProfile);

  // Find assignments for this project that match this candidate's profile
  const { data: assignments, error: assignmentsError } = await supabase
    .from('hr_resource_assignments')
    .select('id, booking_status, profile_id, seniority')
    .eq('project_id', project_id)
    .eq('booking_status', 'recherche')
    .eq('profile_id', candidateProfile.profile_id)  // This should match the hr_profile ID, not candidate ID
    .eq('seniority', candidateProfile.seniority);

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError);
    throw new Error(`Failed to find assignments: ${assignmentsError.message}`);
  }

  if (!assignments || assignments.length === 0) {
    throw new Error('No matching assignment found for this candidate in this project');
  }

  // Take the first matching assignment
  const targetAssignment = assignments[0];
  console.log('Found matching assignment:', targetAssignment.id, 'for candidate:', candidate_email);
  console.log('Assignment details:', {
    id: targetAssignment.id,
    profile_id: targetAssignment.profile_id,
    seniority: targetAssignment.seniority,
    booking_status: targetAssignment.booking_status
  });

  // Accept the mission directly without using mission-management.ts (which has booking_data issues)
  return await acceptMissionDirect(supabase, targetAssignment.id, candidate_email, project_id);
}

async function acceptMissionDirect(supabase: any, assignment_id: string, candidate_email: string, project_id: string) {
  console.log('acceptMissionDirect called with:', { assignment_id, candidate_email, project_id });

  // First get the candidate ID from the email
  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('email', candidate_email)
    .single();

  if (candidateError || !candidateProfile) {
    throw new Error(`Candidate not found: ${candidate_email}`);
  }

  console.log('Found candidate ID:', candidateProfile.id, 'for email:', candidate_email);

  // Check if assignment is still available
  const { data: assignment, error: fetchError } = await supabase
    .from('hr_resource_assignments')
    .select('id, project_id, profile_id, booking_status')
    .eq('id', assignment_id)
    .single();

  if (fetchError) {
    throw new Error(`Assignment not found: ${fetchError.message}`);
  }

  if (assignment.booking_status !== 'recherche') {
    throw new Error('Cette mission n\'est plus disponible');
  }

  // Update assignment status to accepted AND set candidate_id
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({
      booking_status: 'accepted',
      candidate_id: candidateProfile.id,  // IMPORTANT: Link the candidate!
      updated_at: new Date().toISOString()
    })
    .eq('id', assignment_id)
    .eq('booking_status', 'recherche'); // Atomic update

  if (updateError) {
    throw new Error(`Failed to update assignment: ${updateError.message}`);
  }

  console.log(`Assignment ${assignment_id} updated: booking_status=accepted, candidate_id=${candidateProfile.id}`);

  // Check if all assignments for this project are now accepted
  await checkAndUpdateProjectStatusDirect(supabase, project_id);

  return {
    success: true,
    message: 'Mission acceptée avec succès',
    assignment: {
      id: assignment_id,
      status: 'accepted'
    }
  };
}

async function checkAndUpdateProjectStatusDirect(supabase: any, project_id: string) {
  console.log('Checking project status for:', project_id);

  // Get all assignments for this project
  const { data: assignments, error } = await supabase
    .from('hr_resource_assignments')
    .select('booking_status')
    .eq('project_id', project_id);

  if (error) {
    console.error('Error fetching assignments:', error);
    return;
  }

  if (!assignments || assignments.length === 0) {
    return;
  }

  // Check booking status
  const allAccepted = assignments.every(a => a.booking_status === 'accepted');
  const anyAccepted = assignments.some(a => a.booking_status === 'accepted');

  let newStatus = 'pause';
  if (allAccepted) {
    newStatus = 'play'; // EN COURS - all resources accepted
  } else if (anyAccepted) {
    newStatus = 'attente-team'; // Partially accepted
  } else {
    newStatus = 'nouveaux'; // No resources accepted
  }

  // Update project status
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', project_id);

  if (updateError) {
    console.error('Error updating project status:', updateError);
    return;
  }

  console.log(`Project ${project_id} status updated to: ${newStatus}`);
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

  // Update assignment status to accepted
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({ booking_status: 'accepted' })
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