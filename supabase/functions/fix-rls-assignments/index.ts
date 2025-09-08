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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('=== CORRECTION DES RLS POUR hr_resource_assignments ===');
    
    // Créer ou remplacer la policy pour permettre aux candidats de voir les assignations
    const policies = [
      {
        name: 'candidate_can_view_matching_assignments',
        definition: `
          CREATE POLICY candidate_can_view_matching_assignments ON hr_resource_assignments
          FOR SELECT
          TO authenticated
          USING (
            -- Candidat peut voir les assignations qui lui sont assignées
            candidate_id = auth.uid()
            OR
            -- Candidat peut voir les assignations en recherche qui matchent son profil
            (
              booking_status = 'recherche'
              AND EXISTS (
                SELECT 1 FROM candidate_profiles cp
                WHERE cp.id = auth.uid()
                AND cp.profile_id = hr_resource_assignments.profile_id
                AND cp.seniority = hr_resource_assignments.seniority
                AND cp.status != 'qualification'
              )
            )
          );
        `
      },
      {
        name: 'candidate_can_update_own_assignments',
        definition: `
          CREATE POLICY candidate_can_update_own_assignments ON hr_resource_assignments
          FOR UPDATE
          TO authenticated
          USING (
            -- Candidat peut updater seulement ses propres assignations
            candidate_id = auth.uid()
            OR
            -- Ou les assignations en recherche qui matchent son profil
            (
              booking_status = 'recherche'
              AND EXISTS (
                SELECT 1 FROM candidate_profiles cp
                WHERE cp.id = auth.uid()
                AND cp.profile_id = hr_resource_assignments.profile_id
                AND cp.seniority = hr_resource_assignments.seniority
                AND cp.status != 'qualification'
              )
            )
          );
        `
      }
    ];
    
    // D'abord, supprimer les anciennes policies si elles existent
    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS ${policy.name} ON hr_resource_assignments;`
        });
      } catch (e) {
        console.log(`Policy ${policy.name} n'existe pas encore`);
      }
    }
    
    // Ensuite, créer les nouvelles policies
    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', {
          sql: policy.definition
        });
        console.log(`✅ Policy ${policy.name} créée`);
      } catch (e) {
        console.error(`❌ Erreur création policy ${policy.name}:`, e);
      }
    }
    
    // Alternative : Utiliser une requête SQL directe
    const sqlQuery = `
      -- Supprimer les anciennes policies
      DROP POLICY IF EXISTS "Candidates can view assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "Candidates view matching assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "candidate_can_view_matching_assignments" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "candidate_can_update_own_assignments" ON hr_resource_assignments;
      
      -- Créer la nouvelle policy pour SELECT
      CREATE POLICY "Candidates view matching assignments" ON hr_resource_assignments
      FOR SELECT
      TO authenticated
      USING (
        candidate_id = auth.uid()
        OR
        (
          booking_status = 'recherche'
          AND EXISTS (
            SELECT 1 FROM candidate_profiles cp
            WHERE cp.id = auth.uid()
            AND cp.profile_id = hr_resource_assignments.profile_id
            AND cp.seniority = hr_resource_assignments.seniority
            AND cp.status != 'qualification'
          )
        )
      );
      
      -- Créer la policy pour UPDATE
      CREATE POLICY "Candidates update matching assignments" ON hr_resource_assignments
      FOR UPDATE
      TO authenticated
      USING (
        candidate_id = auth.uid()
        OR
        (
          booking_status = 'recherche'
          AND EXISTS (
            SELECT 1 FROM candidate_profiles cp
            WHERE cp.id = auth.uid()
            AND cp.profile_id = hr_resource_assignments.profile_id
            AND cp.seniority = hr_resource_assignments.seniority
            AND cp.status != 'qualification'
          )
        )
      );
    `;
    
    // Exécuter directement via la base
    const { error: execError } = await supabase.rpc('exec_sql', {
      sql: sqlQuery
    });
    
    if (execError) {
      console.error('Erreur SQL:', execError);
      throw execError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies mises à jour pour hr_resource_assignments'
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