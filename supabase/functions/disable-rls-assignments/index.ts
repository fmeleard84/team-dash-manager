import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⚠️  TEMPORARILY DISABLING RLS for hr_resource_assignments')
    console.log('This is for debugging purposes only')

    // Test current state first
    const testProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    
    const { data: beforeTest } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status, profile_id')
      .eq('profile_id', testProfileId)
      .in('booking_status', ['accepted', 'booké'])

    console.log(`Before RLS change: Found ${beforeTest?.length || 0} accepted assignments`)

    // We can't easily disable RLS from here, so let's create a bypass function
    // Instead, let's check what's really in the database with service role
    const { data: allAssignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority,
        booking_status,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('profile_id', testProfileId)
      .eq('seniority', 'intermediate')

    console.log(`Total assignments for profile: ${allAssignments?.length || 0}`)

    const acceptedAssignments = allAssignments?.filter(a => 
      a.booking_status === 'accepted' || a.booking_status === 'booké'
    ) || []

    console.log(`Accepted assignments: ${acceptedAssignments.length}`)

    // Check the current RLS policies
    const { data: policies } = await supabaseClient
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'hr_resource_assignments')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS diagnostic completed',
        data: {
          profileId: testProfileId,
          totalAssignments: allAssignments?.length || 0,
          acceptedAssignments: acceptedAssignments.length,
          acceptedDetails: acceptedAssignments.map(a => ({
            id: a.id,
            booking_status: a.booking_status,
            project_title: a.projects?.title,
            project_status: a.projects?.status
          })),
          allAssignmentsPreview: allAssignments?.slice(0, 3).map(a => ({
            id: a.id,
            booking_status: a.booking_status,
            seniority: a.seniority
          }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})