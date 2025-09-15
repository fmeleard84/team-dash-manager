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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .from('wiki_pages')
      .select('*', { count: 'exact', head: true })

    console.log('RLS check:', { rlsStatus, rlsError })

    // Get policies info
    const { data: policies, error: policiesError } = await supabaseAdmin
      .rpc('get_policies_for_table', { table_name: 'wiki_pages' })
      .select('*')

    // Test visibility with different scenarios
    const { data: testData } = await supabaseAdmin
      .from('wiki_pages')
      .select('id, title, is_public, author_id, project_id')
      .limit(5)

    console.log('Test data:', testData)

    // Check actual SQL policies
    const query = `
      SELECT
        pol.polname as policy_name,
        CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          ELSE pol.polcmd::text
        END as command,
        pg_get_expr(pol.polqual, pol.polrelid) as policy_condition,
        pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
        rol.rolname as role_name
      FROM pg_policy pol
      JOIN pg_class cls ON pol.polrelid = cls.oid
      JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
      WHERE cls.relname = 'wiki_pages'
      ORDER BY pol.polname;
    `

    const { data: sqlPolicies, error: sqlError } = await supabaseAdmin
      .rpc('exec_sql', { query })
      .single()

    return new Response(
      JSON.stringify({
        policies: sqlPolicies,
        testData,
        policiesError,
        sqlError,
        message: 'Wiki policies check complete'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})