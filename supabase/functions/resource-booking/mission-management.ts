// Fonctions pour la gestion des missions candidats
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function acceptMission(
  supabase: any, 
  assignmentId: string, 
  candidateEmail: string
) {
  console.log('Accepting mission:', { assignmentId });

  // Get assignment details
  const { data: assignment, error: fetchError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      booking_status,
      calculated_price,
      projects (
        id,
        title,
        owner_id
      ),
      hr_profiles (
        name,
        hr_categories (
          name
        )
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (fetchError) {
    throw new Error(`Assignment not found: ${fetchError.message}`);
  }

  // Check if assignment is still available
  if (assignment.booking_status !== 'recherche') {
    throw new Error('Cette mission n\'est plus disponible');
  }

  // Update assignment status (atomic operation)
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({
      booking_status: 'accepted',
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .eq('booking_status', 'recherche'); // Atomic condition

  if (updateError) {
    throw new Error(`Failed to update assignment: ${updateError.message}`);
  }

  // Log success
  console.log(`Assignment ${assignmentId} accepted successfully`);

  // Vérifier si toutes les ressources du projet sont maintenant bookées
  await checkAndUpdateProjectStatus(supabase, assignment.project_id);

  return {
    success: true,
    message: 'Mission acceptée avec succès',
    assignment: {
      id: assignmentId,
      project_title: assignment.projects.title,
      profile_name: assignment.hr_profiles.name,
      status: 'accepted'
    }
  };
}

export async function declineMission(
  supabase: any, 
  assignmentId: string, 
  candidateEmail: string
) {
  console.log('Declining mission:', { assignmentId, candidateEmail });

  const { data: assignment, error: fetchError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      booking_status,
      booking_data,
      projects (
        title
      ),
      hr_profiles (
        name
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (fetchError) {
    throw new Error(`Assignment not found: ${fetchError.message}`);
  }

  // Vérifier les permissions
  const bookingData = assignment.booking_data || {};
  if (bookingData.candidate_email !== candidateEmail) {
    throw new Error('Vous n\'êtes pas autorisé à refuser cette mission');
  }

  // Marquer comme déclinée pour ce candidat
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({
      booking_data: {
        ...bookingData,
        declined_at: new Date().toISOString(),
        declined_by: candidateEmail,
        status: 'declined'
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  if (updateError) {
    throw new Error(`Failed to update assignment: ${updateError.message}`);
  }

  // Relancer la recherche pour trouver d'autres candidats
  // TODO: Implémenter la logique de recherche de nouveaux candidats

  return {
    success: true,
    message: 'Mission refusée',
    assignment: {
      id: assignmentId,
      project_title: assignment.projects.title,
      profile_name: assignment.hr_profiles.name,
      status: 'declined'
    }
  };
}

async function checkAndUpdateProjectStatus(supabase: any, projectId: string) {
  console.log('Checking project status:', projectId);

  // Récupérer toutes les assignations du projet
  const { data: assignments, error } = await supabase
    .from('hr_resource_assignments')
    .select('booking_status')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching assignments:', error);
    return;
  }

  if (!assignments || assignments.length === 0) {
    return;
  }

  // Vérifier si toutes les ressources sont bookées
  const allBooked = assignments.every(a => a.booking_status === 'accepted');
  const anyBooked = assignments.some(a => a.booking_status === 'accepted');

  let newStatus = 'pause'; // Status par défaut
  
  if (allBooked) {
    newStatus = 'play'; // EN COURS - toutes ressources bookées et équipe constituée
  } else if (anyBooked) {
    newStatus = 'attente-team'; // Partiellement booké
  } else {
    newStatus = 'nouveaux'; // Aucune ressource bookée
  }

  // Mettre à jour le statut du projet
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (updateError) {
    console.error('Error updating project status:', updateError);
    return;
  }

  // Si toutes les ressources sont bookées, notifier le client
  if (allBooked) {
    await notifyProjectReady(supabase, projectId);
  }

  console.log(`Project ${projectId} status updated to: ${newStatus}`);
}

async function notifyProjectReady(supabase: any, projectId: string) {
  console.log('Notifying project ready:', projectId);

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      owner_id,
      hr_resource_assignments (
        hr_profiles (
          name
        )
      )
    `)
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  const resourceNames = project.hr_resource_assignments
    ?.map((a: any) => a.hr_profiles?.name)
    .filter(Boolean) || [];

  // Créer notification pour le client
  const { error: notificationError } = await supabase
    .from('candidate_notifications')
    .insert({
      candidate_email: project.owner_id,
      type: 'project_ready',
      title: 'Projet prêt à démarrer !',
      message: `Toutes les ressources sont maintenant assignées au projet "${project.title}". Vous pouvez le démarrer.`,
      project_id: projectId,
      status: 'unread',
      priority: 'high',
      metadata: {
        project_id: projectId,
        project_title: project.title,
        resources_count: resourceNames.length,
        resource_names: resourceNames,
        can_start: true
      }
    });

  if (notificationError) {
    console.error('Error creating ready notification:', notificationError);
  }
}

// Fonction pour obtenir les missions d'un candidat
export async function getCandidateMissions(supabase: any, candidateEmail: string) {
  const { data: assignments, error } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      seniority,
      languages,
      expertises,
      calculated_price,
      booking_status,
      booking_data,
      created_at,
      expires_at,
      projects (
        id,
        title,
        description,
        owner_id,
        budget,
        start_date,
        end_date
      ),
      hr_profiles (
        id,
        name,
        hr_categories (
          name
        )
      ),
      profiles!assignments_client (
        first_name,
        last_name,
        email
      )
    `)
    .eq('booking_data->candidate_email', candidateEmail)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch missions: ${error.message}`);
  }

  return assignments || [];
}

// Fonction pour faire expirer les missions anciennes
export async function expireOldMissions(supabase: any) {
  const { data: expiredAssignments, error } = await supabase
    .from('hr_resource_assignments')
    .update({
      booking_status: 'expired',
      booking_data: supabase.sql`booking_data || '{"expired_at": "${new Date().toISOString()}"}'::jsonb`,
      updated_at: new Date().toISOString()
    })
    .eq('booking_status', 'recherche')
    .lt('expires_at', new Date().toISOString())
    .select('id, project_id');

  if (error) {
    console.error('Error expiring old missions:', error);
    return;
  }

  // Mettre à jour le statut des projets affectés
  const projectIds = [...new Set(expiredAssignments?.map(a => a.project_id) || [])];
  for (const projectId of projectIds) {
    await checkAndUpdateProjectStatus(supabase, projectId);
  }

  console.log(`Expired ${expiredAssignments?.length || 0} old missions`);
}