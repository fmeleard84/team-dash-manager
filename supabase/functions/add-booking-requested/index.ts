import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

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

    // Add booking_requested column to projects table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.projects 
        ADD COLUMN IF NOT EXISTS booking_requested BOOLEAN DEFAULT FALSE;
      `
    })

    if (alterError) {
      console.error('Error adding column:', alterError)
      // Column might already exist, which is fine
    }

    // Add comment for documentation
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN public.projects.booking_requested IS 'Indicates whether the client has clicked "Booker l''équipe" to request team booking';
      `
    })

    if (commentError) {
      console.error('Error adding comment:', commentError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'booking_requested column added to projects table'
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