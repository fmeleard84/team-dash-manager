import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Enabling realtime for critical tables...');

    // Enable realtime for projects table
    await supabase.rpc('execute_sql', {
      query: `
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
        ALTER PUBLICATION supabase_realtime ADD TABLE hr_resource_assignments;
        ALTER PUBLICATION supabase_realtime ADD TABLE candidate_notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE project_events;
      `
    });

    console.log('✅ Realtime enabled for all critical tables');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Realtime enabled for all critical tables'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error enabling realtime:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})