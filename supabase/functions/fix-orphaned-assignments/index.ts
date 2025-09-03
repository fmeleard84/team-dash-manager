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

    // Find all assignments that are accepted but have no candidate_id
    const { data: orphanedAssignments, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('booking_status', 'accepted')
      .is('candidate_id', null)

    if (fetchError) {
      throw new Error(`Failed to fetch assignments: ${fetchError.message}`)
    }

    console.log(`Found ${orphanedAssignments?.length || 0} orphaned assignments`)

    // Reset them to 'recherche' status so they can be properly accepted
    if (orphanedAssignments && orphanedAssignments.length > 0) {
      const { error: updateError } = await supabase
        .from('hr_resource_assignments')
        .update({ 
          booking_status: 'recherche',
          updated_at: new Date().toISOString()
        })
        .eq('booking_status', 'accepted')
        .is('candidate_id', null)

      if (updateError) {
        throw new Error(`Failed to update assignments: ${updateError.message}`)
      }

      // Also update project statuses
      const projectIds = [...new Set(orphanedAssignments.map(a => a.project_id))]
      
      for (const projectId of projectIds) {
        // Check all assignments for this project
        const { data: projectAssignments } = await supabase
          .from('hr_resource_assignments')
          .select('booking_status')
          .eq('project_id', projectId)

        if (projectAssignments) {
          const hasAccepted = projectAssignments.some(a => a.booking_status === 'accepted')
          const newStatus = hasAccepted ? 'attente-team' : 'pause'
          
          await supabase
            .from('projects')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${orphanedAssignments?.length || 0} orphaned assignments`,
        count: orphanedAssignments?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})