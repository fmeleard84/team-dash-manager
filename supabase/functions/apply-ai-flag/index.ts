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
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Execute SQL directly using the admin client
    const { data, error } = await adminClient.from('hr_profiles').select('*').limit(1)
    
    if (error) {
      console.log('Testing connection:', error)
    }

    // Since we can't alter tables directly, let's return the SQL for manual execution
    const sql = `
-- Add is_ai column to hr_profiles table
ALTER TABLE public.hr_profiles 
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.hr_profiles.is_ai IS 'Indicates if this profile is an AI resource rather than a human resource';

-- Update any existing AI profiles if they exist (based on name patterns)
UPDATE public.hr_profiles 
SET is_ai = true 
WHERE LOWER(name) LIKE '%ai%' 
   OR LOWER(name) LIKE '%intelligence artificielle%'
   OR LOWER(name) LIKE '%gpt%'
   OR LOWER(name) LIKE '%claude%'
   OR LOWER(name) LIKE '%bot%';
`

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Please run the following SQL in your Supabase SQL editor:',
        sql: sql
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})