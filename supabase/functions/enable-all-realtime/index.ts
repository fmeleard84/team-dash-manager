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

    console.log('=== ENABLING REALTIME FOR ALL REQUIRED TABLES ===')

    // Direct SQL to enable realtime
    const { data, error } = await supabase
      .from('_supabase_realtime')
      .select('*')
      .limit(1)

    if (error) {
      console.log('Realtime table check error:', error)
    }

    // Enable realtime for critical tables using direct SQL
    const queries = [
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.hr_resource_assignments;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_notifications;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_profiles;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.profiles;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;`
    ]

    const results = []
    
    // Try direct approach first
    for (const sql of queries) {
      const tableName = sql.match(/public\.(\w+)/)?.[1] || 'unknown'
      
      try {
        // Use Deno's fetch to directly call Supabase SQL endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({ sql })
        })

        if (response.ok) {
          console.log(`✅ Realtime enabled for ${tableName}`)
          results.push({ table: tableName, status: 'enabled' })
        } else {
          const errorText = await response.text()
          console.log(`❌ Failed to enable realtime for ${tableName}:`, errorText)
          
          // Alternative approach: Try to directly update replica identity
          const altSql = `ALTER TABLE public.${tableName} REPLICA IDENTITY FULL;`
          const altResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({ sql: altSql })
          })
          
          if (altResponse.ok) {
            console.log(`✅ Replica identity set for ${tableName}`)
            results.push({ table: tableName, status: 'replica_identity_set' })
          } else {
            results.push({ table: tableName, status: 'failed', error: errorText })
          }
        }
      } catch (err) {
        console.error(`Exception for ${tableName}:`, err)
        results.push({ table: tableName, status: 'error', error: err.message })
      }
    }

    // Check if we have exec_sql function
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1'
    }).single()

    const hasExecSql = !funcError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Attempted to enable realtime for all tables',
        hasExecSqlFunction: hasExecSql,
        results,
        note: 'If exec_sql is not available, please enable realtime manually in Supabase dashboard under Database > Replication'
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
        suggestion: 'Please enable realtime manually in Supabase dashboard: Database > Replication > supabase_realtime publication'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  }
})