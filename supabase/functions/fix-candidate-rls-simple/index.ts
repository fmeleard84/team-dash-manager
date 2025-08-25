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

    console.log('🔧 SIMPLE FIX: Candidate RLS for hr_resource_assignments')

    // Test 1: Check if we can read assignments at all with service role
    const { data: allAssignments, error: allError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, profile_id, seniority, booking_status')
      .limit(5)

    console.log('📊 All assignments check:', { count: allAssignments?.length, error: allError })

    // Test 2: Check a specific profile
    const testProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    const { data: profileAssignments, error: profileError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', testProfileId)

    console.log('🎯 Profile assignments:', { 
      profileId: testProfileId,
      count: profileAssignments?.length, 
      error: profileError,
      assignments: profileAssignments?.slice(0, 2) // Show first 2
    })

    // Test 3: Check with seniority filter
    const { data: seniorityAssignments, error: seniorityError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', testProfileId)
      .eq('seniority', 'intermediate')

    console.log('👨‍💼 Seniority filtered:', { 
      count: seniorityAssignments?.length,
      error: seniorityError,
      assignments: seniorityAssignments 
    })

    // Test 4: Check accepted status
    const { data: acceptedAssignments, error: acceptedError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('profile_id', testProfileId)
      .eq('seniority', 'intermediate')
      .in('booking_status', ['accepted', 'booké'])

    console.log('✅ Accepted assignments:', { 
      count: acceptedAssignments?.length,
      error: acceptedError,
      assignments: acceptedAssignments 
    })

    // Test 5: Check candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .eq('profile_id', testProfileId)
      .single()

    console.log('👤 Candidate profile:', {
      found: !!candidateProfile,
      error: candidateError,
      profile: candidateProfile ? {
        id: candidateProfile.id,
        email: candidateProfile.email,
        profile_id: candidateProfile.profile_id,
        seniority: candidateProfile.seniority
      } : null
    })

    // Results summary
    const results = {
      totalAssignments: allAssignments?.length || 0,
      profileAssignments: profileAssignments?.length || 0,
      seniorityAssignments: seniorityAssignments?.length || 0,
      acceptedAssignments: acceptedAssignments?.length || 0,
      candidateFound: !!candidateProfile,
      errors: {
        allError: allError?.message,
        profileError: profileError?.message,
        seniorityError: seniorityError?.message,
        acceptedError: acceptedError?.message,
        candidateError: candidateError?.message
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Diagnostic completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Diagnostic error:', error)
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