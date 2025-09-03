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
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('=== FIXING REALTIME CONFIGURATION ===')

    // Tables that need realtime
    const tables = [
      'projects',
      'hr_resource_assignments', 
      'candidate_notifications',
      'notifications',
      'candidate_profiles',
      'profiles',
      'kanban_cards',
      'kanban_columns',
      'messages',
      'project_bookings'
    ]

    const results = []

    for (const table of tables) {
      try {
        // First, ensure replica identity is set
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.${table} REPLICA IDENTITY FULL;`
        }).catch(err => {
          console.log(`Note: Could not set replica identity for ${table}:`, err.message)
        })

        // Then add to publication
        await supabase.rpc('exec_sql', {
          sql: `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.${table};`
        }).catch(err => {
          console.log(`Note: Could not add ${table} to publication:`, err.message)
        })

        results.push({ table, status: 'processed' })
        console.log(`✅ Processed ${table}`)
      } catch (err) {
        results.push({ table, status: 'error', message: err.message })
        console.error(`❌ Error with ${table}:`, err.message)
      }
    }

    // Try to check current status
    let currentTables = []
    try {
      const { data } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT schemaname || '.' || tablename as full_table_name
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          ORDER BY tablename;
        `
      })
      currentTables = data || []
    } catch (err) {
      console.log('Could not check publication status:', err.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime configuration processed',
        results,
        currentTablesInPublication: currentTables,
        instructions: `
If realtime is still not working, please:
1. Go to Supabase Dashboard
2. Navigate to Database > Replication
3. Under "Source", find the supabase_realtime publication
4. Make sure these tables are enabled:
   - projects
   - hr_resource_assignments
   - candidate_profiles
   - profiles
5. If not, click "Add table" and select them
6. Click "Enable" for each table
        `
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
        manual_fix: `
Please enable realtime manually:
1. Go to https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/database/replication
2. Enable realtime for:
   - projects
   - hr_resource_assignments
   - candidate_profiles
   - profiles
        `
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  }
})