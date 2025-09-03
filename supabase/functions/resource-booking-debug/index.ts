import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Always handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Resource booking debug - request received')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    const { projectId, action } = requestBody
    
    console.log('📝 Request:', { action, projectId })

    if (action === 'find_candidates') {
      // Get project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) {
        console.error('Project error:', projectError)
        throw new Error(`Project not found: ${projectError.message}`)
      }

      console.log('✅ Project found:', project.title)

      // Get resource assignments (sans la relation hr_profiles qui cause des problèmes)
      const { data: resourceAssignments, error: resourceError } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', projectId)
        .eq('booking_status', 'recherche')

      if (resourceError) {
        console.error('Resource error:', resourceError)
        throw new Error(`Resource assignments error: ${resourceError.message}`)
      }

      console.log(`📋 Found ${resourceAssignments?.length || 0} resources to book`)

      let notificationsSent = 0

      for (const assignment of resourceAssignments || []) {
        // Récupérer le profil HR séparément
        const { data: hrProfile } = await supabase
          .from('hr_profiles')
          .select('id, name')
          .eq('id', assignment.profile_id)
          .single()
        
        const profileName = hrProfile?.name || 'Unknown Profile'
        console.log(`🔍 Processing resource: ${profileName} - ${assignment.seniority}`)
        
        // Find matching candidates
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidate_profiles')
          .select('id, first_name, last_name, email')
          .eq('profile_id', assignment.profile_id)
          .eq('seniority', assignment.seniority)
          .eq('status', 'active')

        if (candidatesError) {
          console.error('Candidates error:', candidatesError)
          continue
        }

        console.log(`👥 Found ${candidates?.length || 0} matching candidates`)

        // Create notifications for each matching candidate
        for (const candidate of candidates || []) {
          // Check if notification already exists
          const { data: existingNotif } = await supabase
            .from('candidate_notifications')
            .select('id')
            .eq('candidate_id', candidate.id)
            .eq('resource_assignment_id', assignment.id)
            .eq('type', 'new_mission_request')
            .single()

          if (existingNotif) {
            console.log(`⏭️ Notification already exists for ${candidate.email}`)
            continue
          }

          // Create new notification
          const { error: notifError } = await supabase
            .from('candidate_notifications')
            .insert({
              candidate_id: candidate.id,
              project_id: projectId,
              resource_assignment_id: assignment.id,
              title: `Nouvelle demande de mission: ${project.title}`,
              message: `Une nouvelle opportunité pour le poste de ${profileName} ${assignment.seniority} est disponible.`,
              type: 'new_mission_request',
              status: 'unread'
            })

          if (notifError) {
            console.error(`Failed to notify ${candidate.email}:`, notifError)
          } else {
            console.log(`✅ Notified: ${candidate.email}`)
            notificationsSent++
          }
        }
      }

      const response = {
        success: true,
        message: `${notificationsSent} candidat(s) notifié(s) pour ${resourceAssignments?.length || 0} poste(s)`,
        notificationsSent,
        resourcesCount: resourceAssignments?.length || 0
      }

      console.log('📤 Sending response:', response)

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    console.error('❌ Error in resource-booking:', error)
    
    // Always return proper CORS headers even on error
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})