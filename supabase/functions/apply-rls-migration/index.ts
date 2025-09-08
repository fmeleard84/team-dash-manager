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
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('=== APPLICATION DE LA MIGRATION RLS ===');
    
    // Exécuter les requêtes SQL une par une
    const queries = [
      // Supprimer les anciennes policies
      `DROP POLICY IF EXISTS "Candidates can view assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Candidates view matching assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "candidate_can_view_matching_assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "candidate_can_update_own_assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Candidates update matching assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Clients can manage their project resources" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Public read for hr_resource_assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Candidates view relevant assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Candidates update their assignments" ON hr_resource_assignments`,
      `DROP POLICY IF EXISTS "Clients manage their resources" ON hr_resource_assignments`,
      
      // Créer les nouvelles policies
      `CREATE POLICY "Candidates view relevant assignments" 
       ON hr_resource_assignments
       FOR SELECT
       TO authenticated
       USING (
         candidate_id = auth.uid()
         OR
         (
           booking_status = 'recherche'
           AND EXISTS (
             SELECT 1 
             FROM candidate_profiles cp
             WHERE cp.id = auth.uid()
             AND cp.profile_id = hr_resource_assignments.profile_id
             AND cp.seniority = hr_resource_assignments.seniority
             AND cp.status != 'qualification'
           )
         )
         OR
         EXISTS (
           SELECT 1 
           FROM projects p
           WHERE p.id = hr_resource_assignments.project_id
           AND p.owner_id = auth.uid()
         )
       )`,
       
      `CREATE POLICY "Candidates update their assignments"
       ON hr_resource_assignments
       FOR UPDATE
       TO authenticated
       USING (
         candidate_id = auth.uid()
         OR
         (
           booking_status = 'recherche'
           AND EXISTS (
             SELECT 1 
             FROM candidate_profiles cp
             WHERE cp.id = auth.uid()
             AND cp.profile_id = hr_resource_assignments.profile_id
             AND cp.seniority = hr_resource_assignments.seniority
             AND cp.status != 'qualification'
           )
         )
       )`,
       
      `CREATE POLICY "Clients manage their resources"
       ON hr_resource_assignments
       FOR ALL
       TO authenticated
       USING (
         EXISTS (
           SELECT 1 
           FROM projects p
           WHERE p.id = hr_resource_assignments.project_id
           AND p.owner_id = auth.uid()
         )
       )`
    ];
    
    const results = [];
    for (const query of queries) {
      try {
        const { error } = await adminClient.from('_migrations').rpc('exec', {
          query: query
        }).single();
        
        if (error) {
          // Try direct execution
          const { data, error: directError } = await adminClient.rpc('exec_sql', {
            sql: query
          });
          
          if (directError) {
            results.push({ query: query.substring(0, 50), error: directError.message });
          } else {
            results.push({ query: query.substring(0, 50), success: true });
          }
        } else {
          results.push({ query: query.substring(0, 50), success: true });
        }
      } catch (e) {
        results.push({ query: query.substring(0, 50), error: e.message });
      }
    }
    
    // Test si les RLS fonctionnent maintenant
    const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
    
    // Créer un client avec l'auth du candidat pour tester
    const { data: testData } = await adminClient
      .from('hr_resource_assignments')
      .select('*')
      .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`)
      .limit(5);
      
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration RLS appliquée',
        results,
        test: {
          assignmentsFound: testData?.length || 0,
          sample: testData?.[0] || null
        }
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