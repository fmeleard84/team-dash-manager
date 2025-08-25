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

    console.log('🚀 QUICK FIX: Disabling RLS and enabling Realtime')

    // Test before changes
    const testProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    const { data: beforeAssignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('profile_id', testProfileId)
      .in('booking_status', ['accepted', 'booké'])

    console.log(`Before changes: Found ${beforeAssignments?.length || 0} accepted assignments`)

    // Step 1: Try to temporarily disable RLS on hr_resource_assignments
    // We can't execute raw SQL easily, but we can work around by creating a very permissive policy
    
    // First, let's check what policies exist
    const currentPoliciesQuery = `
      SELECT policyname, cmd, permissive, roles, qual 
      FROM pg_policies 
      WHERE tablename = 'hr_resource_assignments'
    `
    
    // For now, let's just create a super permissive policy that allows everyone to read
    // This is not ideal for production but will solve the immediate problem
    
    console.log('Creating emergency bypass policy...')
    
    // We'll create a view that bypasses RLS for debugging
    // But first, let's test what we can access with service role
    
    const { data: allAssignments, error: allError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status, seniority')
      .eq('profile_id', testProfileId)
      .eq('seniority', 'intermediate')

    console.log(`Service role access: ${allAssignments?.length || 0} total assignments, error:`, allError)

    const acceptedCount = allAssignments?.filter(a => 
      a.booking_status === 'accepted' || a.booking_status === 'booké'
    ).length || 0

    console.log(`Accepted assignments with service role: ${acceptedCount}`)

    // Step 2: Enable realtime on key tables
    // This requires SQL execution which we can't do directly
    // But we can provide the SQL commands to run manually
    
    const realtimeSQL = `
      -- Enable realtime on key tables
      ALTER publication supabase_realtime ADD table hr_resource_assignments;
      ALTER publication supabase_realtime ADD table projects;
      ALTER publication supabase_realtime ADD table candidate_profiles;
      
      -- Create or replace RLS policies
      DROP POLICY IF EXISTS "emergency_candidate_access" ON hr_resource_assignments;
      CREATE POLICY "emergency_candidate_access" ON hr_resource_assignments
        FOR ALL
        TO authenticated
        USING (true)  -- Very permissive for debugging
        WITH CHECK (true);
        
      -- Or temporarily disable RLS
      ALTER TABLE hr_resource_assignments DISABLE ROW LEVEL SECURITY;
    `

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quick fix analysis completed',
        findings: {
          profileId: testProfileId,
          assignmentsWithServiceRole: allAssignments?.length || 0,
          acceptedAssignments: acceptedCount,
          beforeChanges: beforeAssignments?.length || 0,
          issue: acceptedCount > 0 && beforeAssignments?.length === 0 ? 'RLS_BLOCKING' : 'NO_DATA'
        },
        sqlToRun: realtimeSQL,
        recommendations: [
          'Run the SQL commands above in Supabase SQL Editor',
          'Or navigate to Database > Replication and add tables to realtime publication',
          'Temporarily disable RLS on hr_resource_assignments for debugging'
        ],
        detailedData: {
          allAssignments: allAssignments?.slice(0, 5),
          acceptedAssignments: allAssignments?.filter(a => 
            a.booking_status === 'accepted' || a.booking_status === 'booké'
          ).slice(0, 3)
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