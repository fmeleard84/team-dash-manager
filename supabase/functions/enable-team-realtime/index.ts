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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Enable realtime for client_team_members table
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END $$;
      `
    })

    if (error) {
      console.error('Error enabling realtime:', error)
      // Try alternative approach
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please enable realtime manually in Supabase Dashboard',
          instructions: 'Go to Database > Replication and enable realtime for client_team_members table'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Realtime enabled for client_team_members table'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})