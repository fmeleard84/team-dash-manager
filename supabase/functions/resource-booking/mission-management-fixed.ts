// Fixed mission management functions
export async function acceptMission(
  supabase: any, 
  assignmentId: string, 
  candidateEmail: string
) {
  try {
    console.log('Accepting mission:', { assignmentId, candidateEmail });

    // Get assignment details with all necessary relations
    const { data: assignment, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects:project_id (
          id,
          title,
          owner_id,
          status
        ),
        hr_profiles:profile_id (
          name,
          hr_categories:category_id (
            name
          )
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      console.error('Assignment fetch error:', fetchError);
      throw new Error('Assignment not found');
    }

    // Check if assignment is still available
    if (assignment.booking_status !== 'recherche') {
      console.log('Assignment not available, current status:', assignment.booking_status);
      throw new Error('Cette mission n\'est plus disponible');
    }

    // Get candidate ID from email
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('email', candidateEmail)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate not found:', candidateError);
      throw new Error('Candidate profile not found');
    }

    // Update assignment status atomically with candidate_id
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        booking_status: 'accepted',
        candidate_id: candidate.id,  // Associate this specific candidate
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('booking_status', 'recherche') // Atomic check
      .select()
      .single();

    if (updateError || !updatedAssignment) {
      console.error('Update error:', updateError);
      throw new Error('Failed to accept mission - it may have been accepted by another candidate');
    }

    console.log('Assignment accepted successfully');

    // Update project status
    await checkAndUpdateProjectStatus(supabase, assignment.project_id);

    // Send notification to client (skip if table doesn't exist or has issues)
    try {
      if (assignment.projects?.owner_id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: assignment.projects.owner_id,
            title: 'Ressource acceptée',
            message: `Le poste ${assignment.hr_profiles?.name || 'Unknown'} a été accepté pour le projet ${assignment.projects?.title || 'Unknown'}`,
            type: 'resource_accepted',
            metadata: {
              project_id: assignment.project_id,
              assignment_id: assignmentId
            }
          });
        
        if (notifError) {
          console.log('Notification insert error (non-blocking):', notifError.message);
        }
      }
    } catch (notifError) {
      console.log('Notification error (non-blocking):', notifError);
    }

    return {
      success: true,
      message: 'Mission acceptée avec succès',
      assignment: {
        id: assignmentId,
        project_title: assignment.projects?.title,
        profile_name: assignment.hr_profiles?.name,
        status: 'accepted'
      }
    };
  } catch (error) {
    console.error('Error in acceptMission:', error);
    throw error;
  }
}

async function checkAndUpdateProjectStatus(supabase: any, projectId: string) {
  try {
    console.log('Checking project status for:', projectId);
    
    // Get all assignments for this project
    const { data: assignments, error } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status')
      .eq('project_id', projectId);

    if (error || !assignments || assignments.length === 0) {
      console.log('No assignments found or error:', error);
      return;
    }

    // Count accepted assignments
    const acceptedCount = assignments.filter(a => 
      a.booking_status === 'accepted' || a.booking_status === 'booké'
    ).length;
    
    const totalCount = assignments.length;
    const allAccepted = acceptedCount === totalCount;
    const someAccepted = acceptedCount > 0;
    
    console.log(`Project ${projectId}: ${acceptedCount}/${totalCount} resources accepted`);

    // Determine new project status
    let newStatus = 'nouveaux';
    if (allAccepted) {
      newStatus = 'attente-team'; // Ready to start
    } else if (someAccepted) {
      newStatus = 'pause'; // Partially staffed
    }

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project status:', updateError);
    } else {
      console.log(`Project ${projectId} status updated to: ${newStatus}`);
    }
  } catch (error) {
    console.error('Error in checkAndUpdateProjectStatus:', error);
  }
}

export async function declineMission(
  supabase: any, 
  assignmentId: string, 
  candidateEmail: string
) {
  console.log('Declining mission:', { assignmentId, candidateEmail });
  
  // For now, just return success
  // TODO: Implement decline logic if needed
  return {
    success: true,
    message: 'Mission declined',
    assignment: {
      id: assignmentId,
      status: 'declined'
    }
  };
}

export async function getCandidateMissions(
  supabase: any,
  candidateEmail: string
) {
  console.log('Getting candidate missions for:', candidateEmail);
  
  // TODO: Implement if needed
  return [];
}

export async function expireOldMissions(supabase: any) {
  console.log('Expiring old missions');
  // TODO: Implement if needed
}