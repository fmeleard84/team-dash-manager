import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // First, let's check the current constraint
    const { data: checkConstraint, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname LIKE '%candidate_profiles_status%'
      `
    })

    console.log('Current constraints:', checkConstraint)

    // Drop the old constraint and create a new one with correct values
    const { error: fixError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the old constraint if it exists
        ALTER TABLE public.candidate_profiles
        DROP CONSTRAINT IF EXISTS candidate_profiles_status_check;

        -- Add the new constraint with correct values
        ALTER TABLE public.candidate_profiles
        ADD CONSTRAINT candidate_profiles_status_check
        CHECK (status IN ('qualification', 'disponible', 'en_pause', 'indisponible'));

        -- Update any invalid statuses to a valid default
        UPDATE public.candidate_profiles
        SET status = 'disponible'
        WHERE status IS NULL OR status NOT IN ('qualification', 'disponible', 'en_pause', 'indisponible');
      `
    })

    if (fixError) {
      console.error('Error fixing constraint:', fixError)
      throw fixError
    }

    // Verify the fix
    const { data: verifyConstraint, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname = 'candidate_profiles_status_check'
      `
    })

    console.log('New constraint:', verifyConstraint)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Constraint fixed successfully',
        constraint: verifyConstraint
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})