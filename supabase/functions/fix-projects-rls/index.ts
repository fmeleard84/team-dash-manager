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
    
    console.log('=== CORRECTION DES RLS POUR PROJECTS ===');
    
    // Lister les policies existantes
    const { data: existingPolicies } = await adminClient
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'projects');
      
    console.log('Policies existantes:', existingPolicies?.map(p => p.policyname));
    
    // Supprimer les anciennes policies
    const dropQueries = [
      `DROP POLICY IF EXISTS "Public read for projects" ON projects`,
      `DROP POLICY IF EXISTS "Clients can manage their own projects" ON projects`,
      `DROP POLICY IF EXISTS "Candidates can view projects they are assigned to" ON projects`,
      `DROP POLICY IF EXISTS "Users can view projects" ON projects`,
      `DROP POLICY IF EXISTS "Allow all users to view projects" ON projects`
    ];
    
    for (const query of dropQueries) {
      try {
        await adminClient.rpc('exec_sql', { sql: query });
        console.log('✅ Supprimé:', query.match(/"([^"]+)"/)?.[1]);
      } catch (e) {
        console.log('⚠️ Erreur suppression:', e.message);
      }
    }
    
    // Créer la nouvelle policy pour permettre aux candidats de voir les projets
    const createQuery = `
      CREATE POLICY "Users can view projects" 
      ON projects 
      FOR SELECT 
      TO authenticated
      USING (
        -- Les clients peuvent voir leurs propres projets
        owner_id = auth.uid()
        OR
        -- Les candidats peuvent voir les projets où ils ont des assignations
        EXISTS (
          SELECT 1 
          FROM hr_resource_assignments hra
          WHERE hra.project_id = projects.id
          AND (
            -- Candidat directement assigné
            hra.candidate_id = auth.uid()
            OR
            -- Ou mission en recherche qui matche le profil du candidat
            (
              hra.booking_status = 'recherche'
              AND EXISTS (
                SELECT 1 
                FROM candidate_profiles cp
                WHERE cp.id = auth.uid()
                AND cp.profile_id = hra.profile_id
                AND cp.seniority = hra.seniority
                AND cp.status != 'qualification'
              )
            )
          )
        )
      )
    `;
    
    try {
      await adminClient.rpc('exec_sql', { sql: createQuery });
      console.log('✅ Nouvelle policy créée');
    } catch (e) {
      console.error('❌ Erreur création policy:', e.message);
      throw e;
    }
    
    // Policy pour UPDATE
    const updateQuery = `
      CREATE POLICY "Clients can update their projects"
      ON projects
      FOR UPDATE
      TO authenticated
      USING (owner_id = auth.uid())
    `;
    
    try {
      await adminClient.rpc('exec_sql', { sql: updateQuery });
      console.log('✅ Policy UPDATE créée');
    } catch (e) {
      console.log('⚠️ Policy UPDATE existe déjà ou erreur:', e.message);
    }
    
    // Policy pour INSERT
    const insertQuery = `
      CREATE POLICY "Clients can create projects"
      ON projects
      FOR INSERT
      TO authenticated
      WITH CHECK (owner_id = auth.uid())
    `;
    
    try {
      await adminClient.rpc('exec_sql', { sql: insertQuery });
      console.log('✅ Policy INSERT créée');
    } catch (e) {
      console.log('⚠️ Policy INSERT existe déjà ou erreur:', e.message);
    }
    
    // Policy pour DELETE
    const deleteQuery = `
      CREATE POLICY "Clients can delete their projects"
      ON projects
      FOR DELETE
      TO authenticated
      USING (owner_id = auth.uid())
    `;
    
    try {
      await adminClient.rpc('exec_sql', { sql: deleteQuery });
      console.log('✅ Policy DELETE créée');
    } catch (e) {
      console.log('⚠️ Policy DELETE existe déjà ou erreur:', e.message);
    }
    
    // Test avec un projet spécifique
    const projectId = '4ec0b104-2fef-4f3c-be22-9e504903fc75'; // test1217
    const { data: testProject, error: testError } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies mises à jour pour projects',
        test: {
          projectFound: !!testProject,
          projectTitle: testProject?.title,
          error: testError?.message
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