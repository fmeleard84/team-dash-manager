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
    const { action, assignmentId, changes, reason } = await req.json()
    console.log('🔄 Processing resource modification:', { assignmentId, changes, reason })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer l'assignation actuelle
    const { data: assignment, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select('*, projects(*)')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      throw new Error('Assignment not found')
    }

    console.log('📋 Current assignment:', {
      id: assignment.id,
      booking_status: assignment.booking_status,
      profile_id: assignment.profile_id,
      seniority: assignment.seniority
    })

    // Si pas de candidat actuellement assigné, mise à jour simple
    if (!['accepted', 'booké', 'recherche'].includes(assignment.booking_status)) {
      console.log('✅ No candidate assigned, simple update')
      
      const { error: updateError } = await supabase
        .from('hr_resource_assignments')
        .update({
          ...changes,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Resource updated without candidate impact'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Trouver le candidat actuel via les notifications acceptées
    console.log('🔍 Finding current candidate via notifications...')
    const { data: acceptedNotification } = await supabase
      .from('candidate_notifications')
      .select(`
        candidate_id,
        candidate_profiles!candidate_id (
          id,
          first_name,
          last_name,
          email,
          profile_id,
          seniority
        )
      `)
      .eq('resource_assignment_id', assignmentId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentCandidate = acceptedNotification?.candidate_profiles

    if (currentCandidate) {
      console.log('👤 Current candidate found:', currentCandidate.email)
      
      // 1. Notifier le candidat sortant
      const { error: notifError } = await supabase
        .from('candidate_notifications')
        .insert({
          candidate_id: currentCandidate.id,
          project_id: assignment.project_id,
          resource_assignment_id: assignmentId,
          title: `Modification de mission: ${assignment.projects?.title || 'Projet'}`,
          message: reason || 'Le client a modifié les exigences de cette mission. Vous n\'êtes plus assigné à cette ressource.',
          type: 'resource_change',
          status: 'unread'
        })

      if (notifError) {
        console.error('Error creating outgoing notification:', notifError)
      } else {
        console.log('📤 Outgoing candidate notified')
      }

      // 2. Marquer les anciennes notifications comme obsolètes
      await supabase
        .from('candidate_notifications')
        .update({ status: 'archived' })
        .eq('resource_assignment_id', assignmentId)
        .eq('candidate_id', currentCandidate.id)
        .in('type', ['new_mission_request', 'mission_accepted'])
    }

    // 3. Mettre à jour l'assignation avec les nouvelles exigences
    console.log('📝 Updating assignment with new requirements...')
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        ...changes,
        booking_status: 'recherche', // Remettre en recherche
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)

    if (updateError) throw updateError

    // 4. Trouver et notifier les nouveaux candidats correspondants
    console.log('🔍 Finding matching candidates for new requirements...')
    const newProfileId = changes.profile_id || assignment.profile_id
    const newSeniority = changes.seniority || assignment.seniority

    const { data: matchingCandidates } = await supabase
      .from('candidate_profiles')
      .select('id, email, first_name, last_name')
      .eq('profile_id', newProfileId)
      .eq('seniority', newSeniority)
      .eq('status', 'active')

    if (matchingCandidates && matchingCandidates.length > 0) {
      console.log(`📨 Creating notifications for ${matchingCandidates.length} matching candidates`)
      
      for (const candidate of matchingCandidates) {
        // Ne pas renotifier le candidat sortant
        if (candidate.id === currentCandidate?.id) continue

        const { error: newNotifError } = await supabase
          .from('candidate_notifications')
          .insert({
            candidate_id: candidate.id,
            project_id: assignment.project_id,
            resource_assignment_id: assignmentId,
            title: `Nouvelle demande de mission: ${assignment.projects?.title || 'Projet'}`,
            message: 'Une nouvelle opportunité de mission correspondant à votre profil est disponible.',
            type: 'new_mission_request',
            status: 'unread'
          })

        if (newNotifError) {
          console.error(`Error notifying ${candidate.email}:`, newNotifError)
        } else {
          console.log(`✅ Notified: ${candidate.email}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Resource modification applied successfully',
        outgoingCandidate: currentCandidate?.email,
        newCandidatesNotified: matchingCandidates?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in resource modification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})