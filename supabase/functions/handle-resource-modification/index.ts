import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ModificationRequest {
  action: 'analyze' | 'apply';
  assignmentId: string;
  changes: {
    profile_id?: string;
    seniority?: string;
    languages?: string[];
    expertises?: string[];
  };
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: ModificationRequest = await req.json();
    const { action, assignmentId, changes, reason } = body;

    console.log('Resource modification request:', { action, assignmentId, changes });

    if (action === 'analyze') {
      // Analyser l'impact des changements
      const impact = await analyzeModificationImpact(supabase, assignmentId, changes);
      return new Response(
        JSON.stringify(impact),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'apply') {
      // Appliquer les modifications
      const result = await applyResourceModification(supabase, assignmentId, changes, reason);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})

async function analyzeModificationImpact(supabase: any, assignmentId: string, changes: any) {
  // Récupérer l'assignation actuelle
  const { data: assignment, error: assignmentError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles!profile_id (
        id,
        name
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (assignmentError || !assignment) {
    throw new Error('Assignment not found');
  }

  // Si pas booké ou accepted, pas d'impact
  if (!['accepted', 'booké'].includes(assignment.booking_status)) {
    return {
      hasImpact: false,
      requiresRebooking: false,
      message: 'Aucun candidat actuellement assigné, modification libre',
      currentCandidate: null
    };
  }

  // IMPORTANT: Trouver le candidat actuel basé sur le matching profile_id + seniority
  // Car current_candidate_id n'est pas rempli dans le système existant
  // On cherche d'abord via les notifications acceptées qui sont plus fiables
  
  // Chercher via les notifications acceptées pour cette assignation
  const { data: acceptedNotifications } = await supabase
    .from('candidate_notifications')
    .select(`
      candidate_id,
      candidate_profiles!candidate_id (
        id,
        first_name,
        last_name,
        email,
        seniority,
        profile_id
      )
    `)
    .eq('resource_assignment_id', assignmentId)
    .eq('status', 'accepted')
    .single();
  
  let currentCandidate = acceptedNotifications?.candidate_profiles;
  
  if (!currentCandidate) {
    // Chercher via les notifications acceptées pour ce projet
    const { data: acceptedNotifications } = await supabase
      .from('candidate_notifications')
      .select(`
        candidate_id,
        candidate_profiles!candidate_id (
          id,
          first_name,
          last_name,
          email,
          seniority,
          profile_id
        )
      `)
      .eq('resource_assignment_id', assignmentId)
      .eq('status', 'accepted')
      .single();
    
    currentCandidate = acceptedNotifications?.candidate_profiles;
  }

  if (!currentCandidate) {
    console.log('No current candidate found for assignment, modification is free');
    return {
      hasImpact: false,
      requiresRebooking: false,
      message: 'Aucun candidat actuellement assigné, modification libre',
      currentCandidate: null
    };
  }

  console.log('Found current candidate:', currentCandidate);
  const impactDetails = {
    hasImpact: false,
    requiresRebooking: false,
    changeType: null as string | null,
    currentCandidate: {
      id: currentCandidate.id,
      name: `${currentCandidate.first_name} ${currentCandidate.last_name}`,
      email: currentCandidate.email
    },
    message: '',
    missingSkills: {
      languages: [] as string[],
      expertises: [] as string[]
    }
  };

  // CAS 1: Changement de profil/métier
  if (changes.profile_id && changes.profile_id !== assignment.profile_id) {
    const { data: newProfile } = await supabase
      .from('hr_profiles')
      .select('name')
      .eq('id', changes.profile_id)
      .single();

    impactDetails.hasImpact = true;
    impactDetails.requiresRebooking = true;
    impactDetails.changeType = 'profile_change';
    impactDetails.message = `Le poste "${assignment.hr_profiles.name}" sera remplacé par "${newProfile?.name}". ${currentCandidate.first_name} ${currentCandidate.last_name} sera notifié et ses accès révoqués.`;
    return impactDetails;
  }

  // CAS 2: Changement de séniorité - TOUJOURS UN REMPLACEMENT
  // Une ressource n'a qu'une seule séniorité, contrairement aux langues/expertises
  if (changes.seniority && changes.seniority !== assignment.seniority) {
    impactDetails.hasImpact = true;
    impactDetails.requiresRebooking = true;
    impactDetails.changeType = 'seniority_change';
    impactDetails.message = `Changement de séniorité de ${assignment.seniority} vers ${changes.seniority}. ${currentCandidate.first_name} ${currentCandidate.last_name} sera remplacé par un profil ${changes.seniority}.`;
    return impactDetails;
  }

  // CAS 3: Modification des compétences
  if (changes.languages || changes.expertises) {
    // Récupérer les compétences du candidat
    const { data: candidateLanguages } = await supabase
      .from('candidate_languages')
      .select('language_id, hr_languages(name)')
      .eq('candidate_id', currentCandidate.id);

    const { data: candidateExpertises } = await supabase
      .from('candidate_expertises')
      .select('expertise_id, hr_expertises(name)')
      .eq('candidate_id', currentCandidate.id);

    const candidateLangNames = candidateLanguages?.map(l => l.hr_languages?.name) || [];
    const candidateExpNames = candidateExpertises?.map(e => e.hr_expertises?.name) || [];

    // Vérifier les langues manquantes
    if (changes.languages) {
      const missingLanguages = changes.languages.filter(lang => 
        !candidateLangNames.includes(lang)
      );
      if (missingLanguages.length > 0) {
        impactDetails.hasImpact = true;
        impactDetails.requiresRebooking = true;
        impactDetails.missingSkills.languages = missingLanguages;
      }
    }

    // Vérifier les expertises manquantes
    if (changes.expertises) {
      const missingExpertises = changes.expertises.filter(exp => 
        !candidateExpNames.includes(exp)
      );
      if (missingExpertises.length > 0) {
        impactDetails.hasImpact = true;
        impactDetails.requiresRebooking = true;
        impactDetails.missingSkills.expertises = missingExpertises;
      }
    }

    if (impactDetails.requiresRebooking) {
      impactDetails.changeType = 'skill_update';
      const missingItems = [];
      if (impactDetails.missingSkills.languages.length > 0) {
        missingItems.push(`Langues: ${impactDetails.missingSkills.languages.join(', ')}`);
      }
      if (impactDetails.missingSkills.expertises.length > 0) {
        missingItems.push(`Expertises: ${impactDetails.missingSkills.expertises.join(', ')}`);
      }
      impactDetails.message = `${currentCandidate.first_name} ${currentCandidate.last_name} ne possède pas les compétences suivantes: ${missingItems.join(' | ')}. Un remplacement sera nécessaire.`;
    } else if (changes.languages || changes.expertises) {
      impactDetails.message = 'Le candidat actuel possède toutes les compétences requises. Mise à jour simple.';
    }
  }

  return impactDetails;
}

async function applyResourceModification(
  supabase: any, 
  assignmentId: string, 
  changes: any, 
  reason?: string
) {
  // D'abord analyser l'impact
  const impact = await analyzeModificationImpact(supabase, assignmentId, changes);

  // Récupérer l'assignation actuelle
  const { data: assignment } = await supabase
    .from('hr_resource_assignments')
    .select('*, hr_profiles!profile_id(name)')
    .eq('id', assignmentId)
    .single();

  // Si pas d'impact ou pas de rebooking nécessaire, mise à jour simple
  if (!impact.requiresRebooking) {
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        ...changes,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      requiresRebooking: false,
      message: 'Modification appliquée sans impact sur le candidat actuel'
    };
  }

  // Sinon, créer une transition
  const transitionData = {
    project_id: assignment.project_id,
    assignment_id: assignmentId,
    transition_type: impact.changeType,
    previous_candidate_id: assignment.current_candidate_id,
    previous_profile_id: assignment.profile_id,
    previous_seniority: assignment.seniority,
    previous_languages: assignment.languages,
    previous_expertises: assignment.expertises,
    new_profile_id: changes.profile_id || assignment.profile_id,
    new_seniority: changes.seniority || assignment.seniority,
    new_languages: changes.languages || assignment.languages,
    new_expertises: changes.expertises || assignment.expertises,
    status: 'pending',
    reason: reason || impact.message,
    notification_message: generateNotificationMessage(impact, assignment, changes)
  };

  const { data: transition, error: transitionError } = await supabase
    .from('resource_transitions')
    .insert(transitionData)
    .select()
    .single();

  if (transitionError) {
    throw transitionError;
  }

  // Marquer l'assignation comme en cours de modification
  await supabase
    .from('hr_resource_assignments')
    .update({
      modification_in_progress: true,
      last_modified_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  // Trouver et révoquer les accès du candidat actuel
  // Comme current_candidate_id n'est pas utilisé dans le système existant, on doit le trouver
  let candidateToRevoke = assignment.current_candidate_id;
  
  if (!candidateToRevoke) {
    // Trouver le candidat via le matching ou les notifications acceptées
    const { data: matchingCandidates } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('profile_id', assignment.profile_id)
      .eq('seniority', assignment.seniority)
      .eq('status', 'en-mission');
    
    if (matchingCandidates?.[0]) {
      candidateToRevoke = matchingCandidates[0].id;
    } else {
      // Chercher via les notifications
      const { data: acceptedNotif } = await supabase
        .from('candidate_notifications')
        .select('candidate_id')
        .eq('resource_assignment_id', assignmentId)
        .eq('status', 'accepted')
        .single();
      
      candidateToRevoke = acceptedNotif?.candidate_id;
    }
  }
  
  if (candidateToRevoke) {
    console.log('Revoking access for candidate:', candidateToRevoke);
    await revokeAccess(supabase, candidateToRevoke, assignment.project_id, transitionData.notification_message);
    
    // Mettre à jour le statut du candidat
    await supabase
      .from('candidate_profiles')
      .update({ status: 'disponible' })
      .eq('id', candidateToRevoke);
  }

  // Mettre à jour l'assignation avec les nouveaux critères
  const { error: updateError } = await supabase
    .from('hr_resource_assignments')
    .update({
      ...changes,
      booking_status: 'recherche', // Repasser en recherche
      current_candidate_id: null,  // Retirer le candidat actuel
      last_modified_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  if (updateError) {
    throw updateError;
  }

  // Lancer la recherche de nouveaux candidats
  await startCandidateSearch(supabase, assignmentId, transition.id);

  return {
    success: true,
    requiresRebooking: true,
    transitionId: transition.id,
    message: `Modification appliquée. ${impact.message} Recherche de nouveaux candidats en cours.`
  };
}

function generateNotificationMessage(impact: any, assignment: any, changes: any): string {
  switch(impact.changeType) {
    case 'profile_change':
      return `Le client a décidé de remplacer le poste "${assignment.hr_profiles.name}" par un autre profil. Nous vous remercions pour votre disponibilité et espérons collaborer sur de futurs projets.`;
    
    case 'seniority_change':
      return `Le client recherche maintenant un profil ${changes.seniority} pour ce poste. Votre profil ${assignment.seniority} ne correspond plus aux besoins actuels du projet.`;
    
    case 'skill_update':
      const missing = [];
      if (impact.missingSkills.languages.length > 0) {
        missing.push(`langues (${impact.missingSkills.languages.join(', ')})`);
      }
      if (impact.missingSkills.expertises.length > 0) {
        missing.push(`expertises (${impact.missingSkills.expertises.join(', ')})`);
      }
      return `Le client a ajouté de nouvelles exigences au projet nécessitant les ${missing.join(' et ')}. Nous recherchons un profil correspondant à ces nouveaux critères.`;
    
    default:
      return 'Le client a modifié les besoins du projet. Votre participation n\'est plus requise pour le moment.';
  }
}

async function revokeAccess(
  supabase: any, 
  candidateId: string, 
  projectId: string, 
  reason: string
) {
  // Révoquer les droits d'accès
  await supabase
    .from('project_access_rights')
    .update({
      access_status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_reason: reason
    })
    .eq('candidate_id', candidateId)
    .eq('project_id', projectId)
    .eq('access_status', 'active');

  // Créer une notification pour le candidat
  await supabase
    .from('candidate_notifications')
    .insert({
      candidate_id: candidateId,
      project_id: projectId,
      title: 'Modification du projet - Accès révoqué',
      description: reason,
      type: 'access_revoked',
      status: 'unread'
    });
}

async function startCandidateSearch(
  supabase: any, 
  assignmentId: string,
  transitionId: string
) {
  console.log('Starting candidate search for assignment:', assignmentId);
  
  // Mettre à jour le statut de la transition
  await supabase
    .from('resource_transitions')
    .update({
      status: 'searching'
    })
    .eq('id', transitionId);

  // Récupérer l'assignation mise à jour avec les nouveaux critères
  const { data: assignment } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        category_id
      ),
      projects (
        id,
        title,
        description
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (!assignment) {
    console.error('Assignment not found');
    return;
  }

  console.log('Assignment details:', {
    profile_id: assignment.profile_id,
    seniority: assignment.seniority,
    languages: assignment.languages,
    expertises: assignment.expertises,
    booking_status: assignment.booking_status
  });

  // IMPORTANT: L'assignation est déjà en status 'recherche'
  // Le système existant va automatiquement créer des notifications via le trigger
  
  // Trouver les candidats correspondants
  // IMPORTANT: Ne pas filtrer par status car les candidats peuvent avoir différents statuts
  // On veut TOUS les candidats qui matchent le profil et la séniorité
  const { data: candidates } = await supabase
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
        hr_languages (name)
      ),
      candidate_expertises (
        expertise_id,
        hr_expertises (name)
      )
    `)
    .eq('profile_id', assignment.profile_id)
    .eq('seniority', assignment.seniority)
    .or('is_email_verified.eq.true,keycloak_user_id.not.is.null');
    // Ne pas filtrer par status pour inclure TOUS les candidats disponibles

  console.log(`Found ${candidates?.length || 0} matching candidates`);

  if (!candidates || candidates.length === 0) {
    console.log('No matching candidates found');
    return;
  }

  // Filtrer par langues et expertises
  const filteredCandidates = candidates.filter(candidate => {
    const candidateLanguages = candidate.candidate_languages?.map(cl => cl.hr_languages?.name) || [];
    const candidateExpertises = candidate.candidate_expertises?.map(ce => ce.hr_expertises?.name) || [];
    
    const hasRequiredLanguages = (assignment.languages || []).every(lang => 
      candidateLanguages.includes(lang)
    );
    
    const hasRequiredExpertises = (assignment.expertises || []).every(exp => 
      candidateExpertises.includes(exp)
    );
    
    return hasRequiredLanguages && hasRequiredExpertises;
  });

  console.log(`${filteredCandidates.length} candidates match all criteria`);

  // Créer les notifications pour les candidats correspondants
  let notificationsCreated = 0;
  
  for (const candidate of filteredCandidates) {
    try {
      // Vérifier si une notification existe déjà
      const { data: existingNotif } = await supabase
        .from('candidate_notifications')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('resource_assignment_id', assignmentId)
        .eq('status', 'unread')
        .single();

      if (!existingNotif) {
        // Créer la notification
        const { error } = await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: candidate.id,
            project_id: assignment.project_id,
            resource_assignment_id: assignmentId,
            title: `Nouvelle opportunité: ${assignment.projects?.title}`,
            description: `Poste: ${assignment.hr_profiles?.name}
Séniorité: ${assignment.seniority}
${assignment.projects?.description || ''}`,
            status: 'unread',
            type: 'new_opportunity',
            profile_type: assignment.hr_profiles?.name,
            required_seniority: assignment.seniority,
            required_languages: assignment.languages,
            required_expertises: assignment.expertises,
            calculated_price: assignment.calculated_price
          });

        if (!error) {
          notificationsCreated++;
          console.log(`Notification created for candidate ${candidate.first_name} ${candidate.last_name}`);
        } else {
          console.error('Error creating notification:', error);
        }
      }
    } catch (e) {
      console.error('Error processing candidate:', e);
    }
  }

  console.log(`Created ${notificationsCreated} notifications`);

  // Mettre à jour la transition si des candidats ont été trouvés
  if (notificationsCreated > 0) {
    await supabase
      .from('resource_transitions')
      .update({
        status: 'candidate_found'
      })
      .eq('id', transitionId);
  }
}