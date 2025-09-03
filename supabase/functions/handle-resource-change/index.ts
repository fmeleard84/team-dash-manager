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
    const { assignmentId, oldData, newData } = await req.json()
    console.log('🔄 Processing resource change:', { assignmentId, oldData, newData })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier si c'est un VRAI changement
    const hasRealChange = 
      oldData.profile_id !== newData.profile_id ||
      oldData.seniority !== newData.seniority ||
      JSON.stringify(oldData.languages || []) !== JSON.stringify(newData.languages || []) ||
      JSON.stringify(oldData.expertises || []) !== JSON.stringify(newData.expertises || [])

    if (!hasRealChange) {
      console.log('✅ No real change detected, skipping')
      return new Response(
        JSON.stringify({ success: true, message: 'No change needed', requiresRebooking: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Détecter le type de changement
    const profileChanged = oldData.profile_id !== newData.profile_id
    const seniorityChanged = oldData.seniority !== newData.seniority
    const languagesChanged = JSON.stringify(oldData.languages || []) !== JSON.stringify(newData.languages || [])
    const expertisesChanged = JSON.stringify(oldData.expertises || []) !== JSON.stringify(newData.expertises || [])

    // Trouver le candidat actuellement assigné (s'il y en a un)
    let currentCandidate = null
    
    // D'abord essayer via les notifications acceptées
    const { data: currentNotification } = await supabase
      .from('candidate_notifications')
      .select('candidate_id, candidate_profiles!candidate_id(*)')
      .eq('resource_assignment_id', assignmentId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (currentNotification) {
      currentCandidate = currentNotification.candidate_profiles
    } else if (oldData.candidate_id) {
      // Sinon essayer via candidate_id dans l'assignment
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', oldData.candidate_id)
        .single()
      
      if (candidate) {
        currentCandidate = candidate
      }
    }

    // Déterminer si on doit changer de candidat
    let requiresCandidateChange = false
    let reason = ''

    if (profileChanged || seniorityChanged) {
      // Changement de profil ou séniorité = changement OBLIGATOIRE
      requiresCandidateChange = true
      reason = profileChanged 
        ? 'Le profil métier a été modifié' 
        : 'Le niveau de séniorité a été modifié'
    } else if ((languagesChanged || expertisesChanged) && currentCandidate) {
      // Pour les changements de compétences, vérifier si le candidat actuel les possède
      console.log('🔍 Checking if current candidate still matches new requirements')
      
      // Vérifier les langues
      if (languagesChanged && newData.languages?.length > 0) {
        const { data: candidateLanguages } = await supabase
          .from('candidate_languages')
          .select('language_id')
          .eq('candidate_id', currentCandidate.id)
        
        const candidateLanguageNames = candidateLanguages?.map(l => l.language_id) || []
        const missingLanguages = newData.languages.filter(l => !candidateLanguageNames.includes(l))
        
        if (missingLanguages.length > 0) {
          requiresCandidateChange = true
          reason = `Le candidat ne maîtrise pas les langues requises: ${missingLanguages.join(', ')}`
        }
      }

      // Vérifier les expertises
      if (!requiresCandidateChange && expertisesChanged && newData.expertises?.length > 0) {
        const { data: candidateExpertises } = await supabase
          .from('candidate_expertises')
          .select('expertise_id')
          .eq('candidate_id', currentCandidate.id)
        
        const candidateExpertiseNames = candidateExpertises?.map(e => e.expertise_id) || []
        const missingExpertises = newData.expertises.filter(e => !candidateExpertiseNames.includes(e))
        
        if (missingExpertises.length > 0) {
          requiresCandidateChange = true
          reason = `Le candidat ne possède pas les expertises requises: ${missingExpertises.join(', ')}`
        }
      }
    }

    // Si on doit changer de candidat
    if (requiresCandidateChange) {
      // Même si on n'a pas trouvé de candidat actuel, on doit gérer le changement
      if (!currentCandidate) {
        console.log('⚠️ No current candidate found, but requirements changed - creating new search assignment')
      }
      console.log('🔄 Candidate change required:', reason)
      
      // 1. Marquer l'assignment actuel comme terminé (VERSION SIMPLIFIÉE)
      // On utilise juste le booking_status sans les colonnes additionnelles
      // IMPORTANT: Garder le candidate_id pour que le candidat voie le projet comme terminé
      const updateData: any = { 
        booking_status: 'completed'
      }
      
      // Si on a un candidat actuel, s'assurer qu'il est bien dans l'assignment
      if (currentCandidate) {
        updateData.candidate_id = currentCandidate.id
      }
      
      const { data: completedAssignment } = await supabase
        .from('hr_resource_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select()
        .single()

      // 2. Créer un nouvel assignment pour la recherche
      const newAssignmentData = {
        project_id: oldData.project_id,
        profile_id: newData.profile_id,
        seniority: newData.seniority,
        languages: newData.languages,
        expertises: newData.expertises,
        calculated_price: newData.calculated_price,
        booking_status: 'recherche',
        node_data: newData.node_data || {},
        created_at: new Date().toISOString()
      }

      const { data: newAssignment, error: insertError } = await supabase
        .from('hr_resource_assignments')
        .insert(newAssignmentData)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating new assignment:', insertError)
        throw insertError
      }

      // 3. Notifier le candidat sortant (s'il existe)
      if (currentCandidate) {
        await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: currentCandidate.id,
            resource_assignment_id: assignmentId,
            project_id: oldData.project_id,
            type: 'mission_completed',
            title: 'Mission terminée',
            message: `Cette mission a été clôturée car ${reason.toLowerCase()}. Merci pour votre participation.`,
            status: 'unread'
          })

        console.log('📤 Notified outgoing candidate:', currentCandidate.email)
      }

      // 4. Mettre le projet en attente-team (TOUJOURS si on change de candidat)
      const { data: project } = await supabase
        .from('projects')
        .select('status')
        .eq('id', oldData.project_id)
        .single()

      console.log('🔍 Current project status:', project?.status)

      // Toujours mettre en attente-team si on change de candidat
      // Car il n'a plus toutes ses ressources acceptées
      const { data: updatedProject, error: updateProjectError } = await supabase
        .from('projects')
        .update({ status: 'attente-team' })
        .eq('id', oldData.project_id)
        .select()
        .single()
      
      if (updateProjectError) {
        console.error('❌ Error updating project status:', updateProjectError)
      } else {
        console.log('✅ Project status updated from', project?.status, 'to', updatedProject?.status)
      }

      // 5. Lancer la recherche de nouveaux candidats
      const { data: newCandidates } = await supabase
        .from('candidate_profiles')
        .select('id, email')
        .eq('profile_id', newData.profile_id)
        .eq('seniority', newData.seniority)
        .neq('status', 'qualification') // Exclure les candidats en qualification
        .limit(10)

      for (const candidate of newCandidates || []) {
        await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: candidate.id,
            resource_assignment_id: newAssignment.id,
            project_id: newData.project_id,
            type: 'new_mission_request',
            title: 'Nouvelle opportunité de mission',
            message: 'Une mission correspondant à votre profil est disponible.',
            status: 'unread'
          })
        console.log('✅ Notified new candidate:', candidate.email)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          requiresRebooking: true,
          reason,
          outgoingCandidate: currentCandidate?.email || null,
          newAssignmentId: newAssignment.id,
          newCandidatesNotified: newCandidates?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Pas de changement de candidat nécessaire, juste mettre à jour les données
      console.log('✅ No candidate change needed, updating assignment data')
      
      // Préparer les données de mise à jour sans les champs problématiques
      const updateData: any = {
        profile_id: newData.profile_id,
        seniority: newData.seniority,
        languages: newData.languages,
        expertises: newData.expertises,
        calculated_price: newData.calculated_price,
        booking_status: newData.booking_status,
        node_data: newData.node_data || {},
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('hr_resource_assignments')
        .update(updateData)
        .eq('id', assignmentId)

      if (updateError) {
        console.error('Error updating assignment:', updateError)
        throw updateError
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          requiresRebooking: false,
          message: 'Assignment updated without candidate change'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})