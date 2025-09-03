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

    console.log('=== APPLYING REALTIME MIGRATION ===')

    // List of tables and their SQL commands
    const migrations = [
      // Projects
      `ALTER TABLE public.projects REPLICA IDENTITY FULL`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.projects`,
      
      // Resource assignments - CRITICAL
      `ALTER TABLE public.hr_resource_assignments REPLICA IDENTITY FULL`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_resource_assignments`,
      
      // Profiles
      `ALTER TABLE public.profiles REPLICA IDENTITY FULL`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles`,
      
      // Candidate profiles
      `ALTER TABLE public.candidate_profiles REPLICA IDENTITY FULL`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_profiles`,
      
      // Notifications
      `ALTER TABLE public.notifications REPLICA IDENTITY FULL`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications`,
    ]

    const results = []
    let successCount = 0
    let errorCount = 0

    // Execute each migration
    for (const sql of migrations) {
      try {
        // Extract table name for logging
        const tableMatch = sql.match(/TABLE (?:public\.)?(\w+)/)
        const tableName = tableMatch ? tableMatch[1] : 'unknown'
        const operation = sql.includes('REPLICA IDENTITY') ? 'replica_identity' : 'publication'
        
        console.log(`Executing: ${operation} for ${tableName}`)
        
        // Try exec_sql if available
        const { error } = await supabase.rpc('exec_sql', { sql })
        
        if (!error) {
          console.log(`✅ Success: ${operation} for ${tableName}`)
          results.push({ 
            table: tableName, 
            operation,
            status: 'success' 
          })
          successCount++
        } else {
          console.error(`❌ Error: ${operation} for ${tableName}:`, error.message)
          results.push({ 
            table: tableName, 
            operation,
            status: 'error',
            error: error.message 
          })
          errorCount++
        }
      } catch (err) {
        console.error(`Exception executing migration:`, err)
        results.push({ 
          sql: sql.substring(0, 50) + '...',
          status: 'exception',
          error: err.message 
        })
        errorCount++
      }
    }

    // Check current publication status
    let currentTables = []
    try {
      const { data } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT tablename 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          ORDER BY tablename;
        `
      })
      
      if (data && Array.isArray(data)) {
        currentTables = data.map(row => row.tablename)
      }
    } catch (err) {
      console.log('Could not check publication status')
    }

    const criticalTables = ['projects', 'hr_resource_assignments', 'profiles', 'candidate_profiles']
    const missingTables = criticalTables.filter(t => !currentTables.includes(t))

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        message: `Realtime migration: ${successCount} successful, ${errorCount} errors`,
        results,
        currentRealtimeTables: currentTables,
        missingCriticalTables: missingTables,
        recommendation: missingTables.length > 0 ? 
          `Please enable realtime manually for: ${missingTables.join(', ')} at https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/database/replication` :
          'All critical tables have realtime enabled!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        help: 'Enable realtime manually at: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/database/replication'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})