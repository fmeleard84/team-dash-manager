import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Starting Direct Storage RLS Diagnosis')

    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {}
    }

    // 1. Check candidate data
    console.log('👤 Checking candidate data...')
    const { data: candidateData, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .select(`
        id,
        first_name,
        last_name,
        user_id,
        email
      `)
      .eq('first_name', 'CDP FM 2708')

    if (candidateError) {
      console.error('❌ Candidate error:', candidateError)
    } else {
      console.log('✅ Candidate data:', candidateData)
      results.analysis.candidateData = candidateData
    }

    // 2. Check auth users for this candidate
    if (candidateData && candidateData.length > 0) {
      console.log('🔑 Checking auth user data...')
      const candidateUserId = candidateData[0].user_id
      
      // We can't directly query auth.users from edge function, so we'll use a different approach
      console.log(`📋 Candidate user_id: ${candidateUserId}`)
      results.analysis.candidateUserId = candidateUserId
    }

    // 3. Check project assignments
    console.log('📂 Checking project assignments...')
    const { data: assignmentData, error: assignmentError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_id,
        candidate_profiles!inner (
          user_id,
          first_name
        )
      `)
      .eq('project_id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')

    if (assignmentError) {
      console.error('❌ Assignment error:', assignmentError)
    } else {
      console.log('✅ Assignment data:', assignmentData)
      results.analysis.assignmentData = assignmentData
    }

    // 4. Check project owner
    console.log('👔 Checking project owner...')
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select(`
        id,
        name,
        owner_id,
        status
      `)
      .eq('id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')

    if (projectError) {
      console.error('❌ Project error:', projectError)
    } else {
      console.log('✅ Project data:', projectData)
      results.analysis.projectData = projectData
    }

    // 5. Try to check storage policies - this requires a custom query
    console.log('🔐 Attempting to check storage policies...')
    try {
      // This might not work in edge functions, but let's try
      const { data: policyData, error: policyError } = await supabaseClient.rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'objects' 
          AND schemaname = 'storage'
          ORDER BY policyname;
        `
      })
      
      if (policyError) {
        console.log('⚠️ Could not fetch policies via RPC:', policyError.message)
        results.analysis.policyError = policyError.message
      } else {
        console.log('✅ Policy data:', policyData)
        results.analysis.policyData = policyData
      }
    } catch (policyErr) {
      console.log('⚠️ Policy check failed:', policyErr)
      results.analysis.policyCheckFailed = String(policyErr)
    }

    // 6. Generate summary
    const candidateFound = candidateData && candidateData.length > 0
    const assignmentFound = assignmentData && assignmentData.length > 0
    const projectFound = projectData && projectData.length > 0

    let bookingStatus = null
    let candidateUserId = null

    if (assignmentFound) {
      const assignment = assignmentData[0]
      bookingStatus = assignment.booking_status
      candidateUserId = assignment.candidate_profiles?.user_id
    }

    results.summary = {
      candidateFound,
      assignmentFound,
      projectFound,
      bookingStatus,
      candidateUserId,
      bookingStatusCorrect: bookingStatus === 'accepted',
      timestamp: new Date().toISOString()
    }

    console.log('📊 Summary:', results.summary)

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.details || 'No additional details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})