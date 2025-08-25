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

    console.log('🔧 FIXING: hr_resource_assignments RLS policies for candidates')

    // Drop existing policies that might be blocking
    const dropPolicies = `
      DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "Users can view assignments for their profile" ON hr_resource_assignments;
    `

    const { error: dropError } = await supabaseClient
      .from('_system')
      .select('*')
      .limit(0) // We just need to execute SQL, not get results
      
    // Since we can't run raw SQL easily, let's use RPC
    const { error: sqlError } = await supabaseClient.rpc('execute_sql', {
      sql_query: dropPolicies
    })

    if (sqlError) {
      console.log('Note: Some drop statements may have failed (expected if policies don\'t exist)')
    }

    // Create new permissive policy for candidates
    const createPolicy = `
      CREATE POLICY "Candidates can view assignments for their profile_id" ON hr_resource_assignments
      FOR SELECT
      USING (
        profile_id IN (
          SELECT profile_id 
          FROM candidate_profiles 
          WHERE email = auth.email()
        )
      );
    `

    const { error: createError } = await supabaseClient.rpc('execute_sql', {
      sql_query: createPolicy
    })

    if (createError) {
      console.error('Error creating policy:', createError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies updated for hr_resource_assignments',
        dropError: dropError?.message,
        createError: createError?.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Fix RLS error:', error)
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