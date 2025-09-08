import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('=== VÉRIFICATION DU STATUT RLS ===');
    
    // Vérifier si RLS est activé sur les tables
    const { data: tables, error } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('projects', 'hr_resource_assignments', 'candidate_profiles')
      `
    });
    
    // Alternative : requête directe sur pg_class
    const { data: rlsStatus } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT 
          c.relname as table_name,
          c.relrowsecurity as rls_enabled,
          c.relforcerowsecurity as rls_forced
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname IN ('projects', 'hr_resource_assignments', 'candidate_profiles')
        AND c.relkind = 'r'
      `
    });
    
    // Vérifier les policies existantes
    const { data: policies } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('projects', 'hr_resource_assignments')
        ORDER BY tablename, policyname
      `
    });
    
    // Si RLS n'est pas activé, l'activer
    const enableRlsQueries = [
      `ALTER TABLE projects ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY`
    ];
    
    const results = [];
    for (const query of enableRlsQueries) {
      try {
        await adminClient.rpc('exec_sql', { sql: query });
        results.push({ query: query.match(/ALTER TABLE (\w+)/)?.[1], success: true });
      } catch (e) {
        results.push({ query: query.match(/ALTER TABLE (\w+)/)?.[1], error: e.message });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        rlsStatus: {
          tables: tables || rlsStatus,
          policies: policies?.length || 0,
          policiesDetails: policies?.map(p => ({
            table: p.tablename,
            policy: p.policyname,
            command: p.cmd,
            roles: p.roles
          }))
        },
        enableResults: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});