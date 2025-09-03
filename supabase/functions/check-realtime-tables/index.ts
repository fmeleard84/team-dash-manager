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

    console.log('=== CHECKING AND ENABLING REALTIME FOR TABLES ===')

    // Tables that need realtime
    const tablesToEnable = [
      'projects',
      'hr_resource_assignments', 
      'candidate_notifications',
      'notifications',
      'candidate_profiles',
      'profiles'
    ]

    const results = []

    for (const tableName of tablesToEnable) {
      try {
        // Enable realtime for the table
        const { error } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.${tableName};
          `
        })

        if (error) {
          console.error(`Error enabling realtime for ${tableName}:`, error)
          results.push({
            table: tableName,
            status: 'error',
            error: error.message
          })
        } else {
          console.log(`✅ Realtime enabled for ${tableName}`)
          results.push({
            table: tableName,
            status: 'enabled'
          })
        }
      } catch (err) {
        console.error(`Exception enabling realtime for ${tableName}:`, err)
        results.push({
          table: tableName,
          status: 'error',
          error: err.message
        })
      }
    }

    // Check current publication status
    const { data: publicationCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime'
        ORDER BY tablename;
      `
    })

    if (!checkError && publicationCheck) {
      console.log('Current tables with realtime enabled:', publicationCheck)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime configuration checked and updated',
        results,
        currentTables: publicationCheck
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to check/enable realtime'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})