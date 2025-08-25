import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { candidateProfileId, seniority } = await req.json()
    
    console.log('🔍 DEBUGGING: Detailed assignment query for:', { candidateProfileId, seniority })

    // 1. Check all assignments for this profile_id
    const { data: allAssignments, error: allError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', candidateProfileId)

    console.log('🗂️ ALL ASSIGNMENTS for profile_id:', allAssignments?.length || 0)
    if (allError) console.log('❌ Error fetching all assignments:', allError)

    // 2. Check assignments with seniority filter
    const { data: seniorityAssignments, error: seniorityError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)

    console.log('🎯 ASSIGNMENTS with seniority filter:', seniorityAssignments?.length || 0)
    if (seniorityError) console.log('❌ Error fetching seniority assignments:', seniorityError)

    // 3. Check accepted assignments specifically
    const { data: acceptedAssignments, error: acceptedError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority, 
        booking_status,
        project_id,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)
      .in('booking_status', ['accepted', 'booké'])

    console.log('✅ ACCEPTED ASSIGNMENTS:', acceptedAssignments?.length || 0)
    if (acceptedError) console.log('❌ Error fetching accepted assignments:', acceptedError)

    // 4. Check specific booking statuses
    const { data: recherche, error: rechercheError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)
      .eq('booking_status', 'recherche')

    const { data: accepted, error: acceptedStatusError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)
      .eq('booking_status', 'accepted')

    const { data: booked, error: bookedError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)
      .eq('booking_status', 'booké')

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          allAssignments: allAssignments || [],
          seniorityAssignments: seniorityAssignments || [],
          acceptedAssignments: acceptedAssignments || [],
          statusBreakdown: {
            recherche: recherche?.length || 0,
            accepted: accepted?.length || 0,
            booké: booked?.length || 0
          }
        },
        errors: {
          allError,
          seniorityError,
          acceptedError,
          rechercheError,
          acceptedStatusError,
          bookedError
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Debug function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})