import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Add is_ai column to hr_profiles table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.hr_profiles 
        ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;
      `
    })
    
    if (alterError) {
      console.error('Error adding column:', alterError)
      // Continue even if column already exists
    }
    
    // Add comment
    await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN public.hr_profiles.is_ai IS 'Indicates if this profile is an AI resource rather than a human resource';
      `
    })
    
    // Update existing AI profiles based on name patterns
    const { error: updateError } = await supabase
      .from('hr_profiles')
      .update({ is_ai: true })
      .or('name.ilike.%ai%,name.ilike.%intelligence artificielle%,name.ilike.%gpt%,name.ilike.%claude%,name.ilike.%bot%')
    
    if (updateError) {
      console.error('Error updating AI profiles:', updateError)
    }
    
    // Get all profiles to show current state
    const { data: profiles } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .order('name')
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI flag added to hr_profiles table',
        profiles: profiles
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})