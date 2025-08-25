import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client
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

    // Execute SQL to enable realtime
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Ensure tables are in realtime publication
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_threads;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_attachments;
        
        -- Set replica identity
        ALTER TABLE messages REPLICA IDENTITY FULL;
        ALTER TABLE message_threads REPLICA IDENTITY FULL;
        ALTER TABLE message_attachments REPLICA IDENTITY FULL;
        
        -- Add to publication
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
        ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
        
        -- Return verification
        SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
      `
    })

    if (error) {
      // Alternative approach: direct SQL execution
      const result = await supabaseAdmin.from('messages').select('id').limit(1)
      
      return new Response(
        JSON.stringify({
          message: 'Could not verify realtime status via SQL',
          tables_accessible: !!result.data,
          note: 'Please enable Realtime manually in the Supabase Dashboard: Database > Replication'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Realtime configuration checked',
        tables_in_publication: data
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
        status: 400
      }
    )
  }
})