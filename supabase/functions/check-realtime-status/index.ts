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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check current realtime publications
    const { data: publications, error: pubError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          ORDER BY tablename;
        `
      })

    if (pubError) {
      console.error('Error checking publications:', pubError)
    }

    // Critical tables for realtime
    const criticalTables = [
      'hr_resource_assignments',
      'candidate_notifications', 
      'resource_transitions',
      'project_access_rights',
      'resource_change_history',
      'projects',
      'kanban_cards',
      'messages',
      'project_files'
    ]

    // Enable realtime for all critical tables
    const results = []
    for (const table of criticalTables) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `
            DO $$
            BEGIN
              ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.${table};
            EXCEPTION WHEN OTHERS THEN
              RAISE NOTICE 'Table % might already be in publication', '${table}';
            END $$;
          `
        })

        if (error) {
          results.push({ table, status: 'error', error: error.message })
        } else {
          results.push({ table, status: 'enabled' })
        }
      } catch (e) {
        results.push({ table, status: 'exception', error: e.message })
      }
    }

    // Re-check publications after enabling
    const { data: newPublications } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          ORDER BY tablename;
        `
      })

    return new Response(
      JSON.stringify({
        success: true,
        before: publications || [],
        after: newPublications || [],
        enabledTables: results,
        criticalTables
      }, null, 2),
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