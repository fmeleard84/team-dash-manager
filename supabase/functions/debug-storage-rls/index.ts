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

    console.log('🔍 Starting Storage RLS Debug Analysis')

    // 1. Check current RLS policies
    console.log('📋 Step 1: Checking RLS policies for storage.objects')
    const { data: policies, error: policiesError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%member%';
      `
    })

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError)
      throw policiesError
    }

    console.log('📋 Current RLS Policies:', policies)

    // 2. Check candidate user_id mapping
    console.log('👤 Step 2: Checking candidate user mapping')
    const { data: candidateData, error: candidateError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
            cp.id,
            cp.first_name,
            cp.last_name,
            cp.user_id,
            cp.email,
            au.id as auth_user_id,
            au.email as auth_email
        FROM candidate_profiles cp
        LEFT JOIN auth.users au ON au.id = cp.user_id
        WHERE cp.first_name = 'CDP FM 2708';
      `
    })

    if (candidateError) {
      console.error('❌ Error fetching candidate data:', candidateError)
      throw candidateError
    }

    console.log('👤 Candidate Data:', candidateData)

    // 3. Check project assignments
    console.log('📂 Step 3: Checking project assignments')
    const { data: assignments, error: assignmentError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
            hra.id,
            hra.project_id,
            hra.booking_status,
            hra.candidate_id,
            cp.user_id,
            cp.first_name
        FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';
      `
    })

    if (assignmentError) {
      console.error('❌ Error fetching assignments:', assignmentError)
      throw assignmentError
    }

    console.log('📂 Project Assignments:', assignments)

    // 4. Check all storage policies
    console.log('🔐 Step 4: Checking all storage policies')
    const { data: allPolicies, error: allPoliciesError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        ORDER BY policyname;
      `
    })

    if (allPoliciesError) {
      console.error('❌ Error fetching all policies:', allPoliciesError)
      throw allPoliciesError
    }

    console.log('🔐 All Storage Policies:', allPolicies)

    // 5. Test RLS logic simulation
    console.log('🧪 Step 5: Testing RLS logic simulation')
    const { data: rlsTest, error: rlsTestError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
            'Candidat validation' as test_type,
            cp.user_id,
            cp.first_name,
            hra.booking_status,
            hra.project_id,
            -- Note: auth.uid() simulation won't work in this context
            cp.user_id as simulated_auth_uid
        FROM candidate_profiles cp
        JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
        WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
          AND cp.first_name = 'CDP FM 2708';
      `
    })

    if (rlsTestError) {
      console.error('❌ Error in RLS test:', rlsTestError)
      throw rlsTestError
    }

    console.log('🧪 RLS Test Results:', rlsTest)

    // 6. Check if there are any client profiles for comparison
    console.log('👔 Step 6: Checking client profiles for comparison')
    const { data: clientData, error: clientError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT 
            p.id as project_id,
            p.owner_id,
            au.email as owner_email
        FROM projects p
        LEFT JOIN auth.users au ON au.id = p.owner_id
        WHERE p.id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';
      `
    })

    if (clientError) {
      console.error('❌ Error fetching client data:', clientError)
      throw clientError
    }

    console.log('👔 Client Data:', clientData)

    const result = {
      success: true,
      analysis: {
        policies: policies,
        candidateData: candidateData,
        assignments: assignments,
        allPolicies: allPolicies,
        rlsTest: rlsTest,
        clientData: clientData
      },
      summary: {
        candidateFound: candidateData && candidateData.length > 0,
        assignmentFound: assignments && assignments.length > 0,
        bookingStatus: assignments && assignments.length > 0 ? assignments[0].booking_status : null,
        userIdMatch: candidateData && candidateData.length > 0 ? 
          candidateData[0].user_id === candidateData[0].auth_user_id : false
      }
    }

    console.log('✅ Debug Analysis Complete:', result.summary)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Fatal error in debug-storage-rls:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.details || 'No additional details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})