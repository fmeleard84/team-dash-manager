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

    console.log('🔧 Fixing IA booking status...')

    // 1. Récupérer tous les profils IA
    const { data: iaProfiles, error: iaError } = await supabase
      .from('hr_profiles')
      .select('id, name')
      .eq('is_ai', true)

    if (iaError) throw iaError

    console.log(`Found ${iaProfiles?.length || 0} IA profiles`)

    // 2. Pour chaque profil IA, mettre à jour toutes ses assignations
    let totalFixed = 0

    for (const profile of iaProfiles || []) {
      const { data: assignments, error: fetchError } = await supabase
        .from('hr_resource_assignments')
        .select('id, booking_status, project_id')
        .eq('profile_id', profile.id)
        .neq('booking_status', 'booké')

      if (fetchError) {
        console.error(`Error fetching assignments for profile ${profile.id}:`, fetchError)
        continue
      }

      if (assignments && assignments.length > 0) {
        console.log(`Found ${assignments.length} assignments to fix for ${profile.name}`)

        // Mettre à jour en masse
        const { error: updateError } = await supabase
          .from('hr_resource_assignments')
          .update({ booking_status: 'booké' })
          .eq('profile_id', profile.id)
          .neq('booking_status', 'booké')

        if (updateError) {
          console.error(`Error updating assignments for profile ${profile.id}:`, updateError)
        } else {
          totalFixed += assignments.length
          console.log(`✅ Fixed ${assignments.length} assignments for ${profile.name}`)
        }
      }
    }

    // 3. Aussi corriger via node_data pour être sûr
    const { data: allAssignments, error: allError } = await supabase
      .from('hr_resource_assignments')
      .select('id, node_data, booking_status, profile_id')
      .neq('booking_status', 'booké')

    if (!allError && allAssignments) {
      const iaAssignments = allAssignments.filter(a => {
        const nodeData = a.node_data as any
        return nodeData?.is_ai === true
      })

      if (iaAssignments.length > 0) {
        console.log(`Found ${iaAssignments.length} additional IA assignments via node_data`)

        for (const assignment of iaAssignments) {
          const { error: updateError } = await supabase
            .from('hr_resource_assignments')
            .update({ booking_status: 'booké' })
            .eq('id', assignment.id)

          if (!updateError) {
            totalFixed++
            console.log(`✅ Fixed assignment ${assignment.id} (detected via node_data.is_ai)`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${totalFixed} IA resource assignments`,
        iaProfiles: iaProfiles?.map(p => p.name),
        totalFixed
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