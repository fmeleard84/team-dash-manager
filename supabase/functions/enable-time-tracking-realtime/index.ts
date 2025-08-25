import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enable realtime for time tracking tables
    const queries = [
      // First ensure the tables exist in the publication
      `ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS active_time_tracking;`,
      `ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS time_tracking_sessions;`,
      
      // Now add them fresh
      `ALTER PUBLICATION supabase_realtime ADD TABLE active_time_tracking;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE time_tracking_sessions;`,
    ];

    const results = [];
    for (const query of queries) {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: query 
      }).single();
      
      if (error) {
        console.error(`Error executing: ${query}`, error);
        results.push({ query, error: error.message });
      } else {
        console.log(`Success: ${query}`);
        results.push({ query, success: true });
      }
    }

    // Verify what tables are currently in the publication
    const verifyQuery = `
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
      AND tablename IN ('active_time_tracking', 'time_tracking_sessions')
      ORDER BY tablename;
    `;

    const { data: tables, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: verifyQuery
    }).single();

    return new Response(
      JSON.stringify({ 
        message: "Realtime configuration updated",
        results,
        enabledTables: tables ? JSON.parse(tables) : [],
        verifyError
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});