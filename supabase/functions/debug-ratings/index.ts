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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get all task_ratings
    const { data: ratings, error: ratingsError } = await supabaseClient
      .from('task_ratings')
      .select('*')
      .order('created_at', { ascending: false })

    if (ratingsError) {
      throw ratingsError
    }

    // Get all candidate profiles
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('candidate_profiles')
      .select('id, user_id, email, first_name, last_name')

    if (candidatesError) {
      throw candidatesError
    }

    // Get all projects with assignments
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*, projects(*), candidate_profiles(*)')

    if (assignmentsError) {
      throw assignmentsError
    }

    return new Response(
      JSON.stringify({
        success: true,
        ratings_count: ratings?.length || 0,
        ratings: ratings,
        candidates: candidates,
        assignments: assignments,
        message: `Found ${ratings?.length || 0} ratings`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})