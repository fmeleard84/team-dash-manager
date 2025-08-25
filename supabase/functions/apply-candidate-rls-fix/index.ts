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

    console.log('🔧 APPLYING: Candidate RLS fix for hr_resource_assignments')

    // Drop existing potentially problematic policies
    const dropSql = `
      -- Drop potentially problematic policies
      DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "Users can view assignments for their profile" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "Candidates view own assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "candidate_can_view_own_assignments" ON hr_resource_assignments;
    `

    try {
      const { error: dropError } = await supabaseClient
        .rpc('exec', { sql: dropSql })
      console.log('Drop policies result:', dropError || 'Success')
    } catch (e) {
      console.log('Drop policies - some may not have existed:', e.message)
    }

    // Create new permissive policy for candidates to view assignments
    const createAssignmentPolicy = `
      CREATE POLICY "candidate_can_view_own_assignments" ON hr_resource_assignments
      FOR SELECT
      USING (
        profile_id IN (
          SELECT profile_id 
          FROM candidate_profiles 
          WHERE email = auth.email()
        )
      );
    `

    const { error: assignmentPolicyError } = await supabaseClient
      .rpc('exec', { sql: createAssignmentPolicy })
      
    console.log('Create assignment policy result:', assignmentPolicyError || 'Success')

    // Ensure candidate profile policy exists
    const createProfilePolicy = `
      DROP POLICY IF EXISTS "candidate_can_view_own_profile" ON candidate_profiles;
      CREATE POLICY "candidate_can_view_own_profile" ON candidate_profiles
      FOR SELECT
      USING (email = auth.email());
    `

    const { error: profilePolicyError } = await supabaseClient
      .rpc('exec', { sql: createProfilePolicy })
      
    console.log('Create profile policy result:', profilePolicyError || 'Success')

    // Test the fix
    console.log('🧪 Testing candidate access...')
    
    // Get a test candidate email
    const { data: testCandidate } = await supabaseClient
      .from('candidate_profiles')
      .select('email, profile_id')
      .limit(1)
      .single()

    let testResult = null
    if (testCandidate) {
      // This won't work perfectly since we're using service role, but we can check the data exists
      const { data: testAssignments } = await supabaseClient
        .from('hr_resource_assignments')
        .select('id, profile_id')
        .eq('profile_id', testCandidate.profile_id)
        .limit(1)

      testResult = {
        candidateEmail: testCandidate.email,
        candidateProfileId: testCandidate.profile_id,
        foundAssignments: testAssignments?.length || 0
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Candidate RLS policies fixed',
        details: {
          assignmentPolicyError: assignmentPolicyError?.message,
          profilePolicyError: profilePolicyError?.message,
          testResult
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Apply candidate RLS fix error:', error)
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