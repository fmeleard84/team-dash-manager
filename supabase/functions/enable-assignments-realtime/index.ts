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

    // Enable realtime for hr_resource_assignments
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable realtime for hr_resource_assignments if not already enabled
        DO $$
        BEGIN
          -- Check if table is already in publication
          IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'hr_resource_assignments'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE hr_resource_assignments;
            RAISE NOTICE 'Realtime enabled for hr_resource_assignments';
          ELSE
            RAISE NOTICE 'Realtime already enabled for hr_resource_assignments';
          END IF;
        END $$;
        
        -- Return current realtime tables
        SELECT 
          schemaname,
          tablename
        FROM 
          pg_publication_tables
        WHERE 
          pubname = 'supabase_realtime'
        ORDER BY tablename;
      `
    })

    if (error) {
      console.error('Error enabling realtime:', error)
      
      // Fallback: try direct SQL
      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `ALTER PUBLICATION supabase_realtime ADD TABLE hr_resource_assignments;`
      })
      
      if (sqlError) {
        // Table might already be in publication, check
        const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT COUNT(*) as count
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'hr_resource_assignments';
          `
        })
        
        if (checkData && checkData[0]?.count > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Realtime already enabled for hr_resource_assignments',
              tables: checkData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        throw sqlError
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime enabled for hr_resource_assignments',
        tables: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})