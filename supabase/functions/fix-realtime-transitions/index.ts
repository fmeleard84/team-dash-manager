import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Enabling realtime for transition tables...')

    // Liste des tables à activer pour le realtime
    const tables = [
      'resource_transitions',
      'project_access_rights',
      'resource_change_history',
      'hr_resource_assignments', // S'assurer que hr_resource_assignments est aussi en realtime
      'candidate_notifications' // Important pour les notifications
    ]

    const results = []

    for (const tableName of tables) {
      try {
        // Activer le realtime pour chaque table
        const { data, error } = await supabaseAdmin
          .rpc('exec_sql', {
            sql: `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.${tableName};`
          })

        if (error) {
          console.error(`Error enabling realtime for ${tableName}:`, error)
          results.push({
            table: tableName,
            status: 'error',
            error: error.message
          })
        } else {
          console.log(`Realtime enabled for ${tableName}`)
          results.push({
            table: tableName,
            status: 'enabled'
          })
        }
      } catch (e) {
        console.error(`Exception for ${tableName}:`, e)
        results.push({
          table: tableName,
          status: 'exception',
          error: e.message
        })
      }
    }

    // Vérifier les publications existantes
    try {
      const { data: publications } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `SELECT schemaname, tablename 
                FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime'
                AND schemaname = 'public';`
        })

      console.log('Current realtime tables:', publications)
    } catch (e) {
      console.log('Could not query publications:', e.message)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Realtime configuration updated',
        results,
        note: 'Tables have been added to realtime publication'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})