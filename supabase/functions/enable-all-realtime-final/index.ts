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

    console.log('🔄 Enabling realtime for all critical tables...')

    // List of ALL tables that need realtime
    const tables = [
      // Core resource management
      'hr_resource_assignments',
      'candidate_notifications',
      'resource_transitions',
      'project_access_rights',
      'resource_change_history',
      
      // Project management
      'projects',
      'project_members',
      'project_files',
      
      // Kanban
      'kanban_cards',
      'kanban_columns',
      
      // Messaging
      'messages',
      'message_read_status',
      
      // Candidates
      'candidate_profiles',
      'candidate_event_notifications',
      
      // Others
      'notifications',
      'task_ratings',
      'invoices',
      'invoice_payments'
    ]

    const results = []
    
    // First, drop and recreate the publication to ensure clean state
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          -- Drop existing tables from publication
          DO $$
          DECLARE
            r RECORD;
          BEGIN
            FOR r IN 
              SELECT schemaname, tablename 
              FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public'
            LOOP
              EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS %I.%I', r.schemaname, r.tablename);
            END LOOP;
          END $$;
        `
      })
      console.log('Cleaned existing realtime configuration')
    } catch (e) {
      console.log('Could not clean publication:', e.message)
    }

    // Now add all tables
    for (const tableName of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.${tableName};`
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
      } catch (e) {
        // Table might not exist, that's OK
        console.log(`⚠️ Could not enable realtime for ${tableName}:`, e.message)
        results.push({
          table: tableName,
          status: 'skipped',
          reason: e.message
        })
      }
    }

    // Verify the final state
    const { data: finalTables } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        ORDER BY tablename;
      `
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime configuration completed',
        results,
        enabledTables: finalTables?.map(t => t.tablename) || [],
        totalEnabled: finalTables?.length || 0
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