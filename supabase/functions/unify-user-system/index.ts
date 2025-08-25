import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Étape 1: Nettoyer les tables (MVP sans données sensibles)
    console.log('🧹 Nettoyage des tables...');
    
    const { error: truncateError1 } = await supabase
      .from('hr_resource_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (truncateError1) {
      console.error('Erreur lors du nettoyage de hr_resource_assignments:', truncateError1);
    }

    const { error: truncateError2 } = await supabase
      .from('hr_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (truncateError2) {
      console.error('Erreur lors du nettoyage de hr_profiles:', truncateError2);
    }

    // Étape 2: Exécuter les modifications de schéma via SQL
    console.log('📝 Application des modifications de schéma...');
    
    const sqlCommands = [
      // Supprimer la colonne profile_id si elle existe
      `ALTER TABLE hr_resource_assignments DROP COLUMN IF EXISTS profile_id;`,
      
      // Rendre candidate_id obligatoire
      `ALTER TABLE hr_resource_assignments ALTER COLUMN candidate_id SET NOT NULL;`,
      
      // Ajouter job_title si n'existe pas
      `ALTER TABLE hr_resource_assignments ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT 'Consultant';`,
      
      // Ajouter display_name si n'existe pas
      `ALTER TABLE hr_resource_assignments ADD COLUMN IF NOT EXISTS display_name TEXT;`,
    ];

    for (const sql of sqlCommands) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
          console.error(`Erreur SQL: ${sql}`, error);
        } else {
          console.log(`✅ Commande exécutée: ${sql.substring(0, 50)}...`);
        }
      } catch (e) {
        console.error(`Exception SQL: ${sql}`, e);
      }
    }

    // Étape 3: Créer les fonctions RPC pour la gestion unifiée
    console.log('🚀 Création des fonctions RPC...');
    
    const rpcFunctions = `
      -- Fonction pour obtenir les projets d'un utilisateur
      CREATE OR REPLACE FUNCTION get_user_projects(user_email TEXT)
      RETURNS TABLE (
        project_id UUID,
        project_title TEXT,
        role TEXT,
        status TEXT,
        created_at TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        -- Projets où l'utilisateur est client
        SELECT 
          p.id as project_id,
          p.title as project_title,
          'client'::TEXT as role,
          p.status,
          p.created_at
        FROM projects p
        JOIN profiles prof ON prof.id = p.owner_id
        WHERE prof.email = user_email
        
        UNION ALL
        
        -- Projets où l'utilisateur est candidat
        SELECT 
          p.id as project_id,
          p.title as project_title,
          'candidate'::TEXT as role,
          p.status,
          hra.created_at
        FROM projects p
        JOIN hr_resource_assignments hra ON hra.project_id = p.id
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE cp.email = user_email
        AND hra.booking_status IN ('accepted', 'booké')
        
        ORDER BY created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Fonction pour obtenir les utilisateurs d'un projet
      CREATE OR REPLACE FUNCTION get_project_users(p_project_id UUID)
      RETURNS TABLE (
        user_id UUID,
        email TEXT,
        display_name TEXT,
        job_title TEXT,
        role TEXT,
        joined_at TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        -- Client du projet
        SELECT 
          p.owner_id as user_id,
          prof.email,
          COALESCE(prof.first_name, SPLIT_PART(prof.email, '@', 1)) as display_name,
          'Client'::TEXT as job_title,
          'client'::TEXT as role,
          p.created_at as joined_at
        FROM projects p
        JOIN profiles prof ON prof.id = p.owner_id
        WHERE p.id = p_project_id
        
        UNION ALL
        
        -- Candidats assignés
        SELECT 
          cp.id as user_id,
          cp.email,
          COALESCE(prof.first_name, SPLIT_PART(cp.email, '@', 1)) as display_name,
          COALESCE(hra.job_title, cp.job_title, 'Consultant') as job_title,
          'candidate'::TEXT as role,
          hra.created_at as joined_at
        FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        LEFT JOIN profiles prof ON prof.id = cp.profile_id
        WHERE hra.project_id = p_project_id
        AND hra.booking_status IN ('accepted', 'booké')
        
        ORDER BY 
          CASE role 
            WHEN 'client' THEN 1 
            WHEN 'candidate' THEN 2 
            ELSE 3 
          END,
          display_name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: rpcFunctions });
    if (rpcError) {
      console.error('Erreur création fonctions RPC:', rpcError);
    } else {
      console.log('✅ Fonctions RPC créées avec succès');
    }

    // Étape 4: Mettre à jour les politiques RLS
    console.log('🔒 Mise à jour des politiques RLS...');
    
    const rlsPolicies = `
      -- Supprimer l'ancienne politique si elle existe
      DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
      
      -- Créer la nouvelle politique
      CREATE POLICY "Candidates can view their assignments" ON hr_resource_assignments
        FOR SELECT
        USING (
          candidate_id IN (
            SELECT id FROM candidate_profiles 
            WHERE email = (auth.jwt() ->> 'email')
          )
        );
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql_query: rlsPolicies });
    if (rlsError) {
      console.error('Erreur mise à jour RLS:', rlsError);
    } else {
      console.log('✅ Politiques RLS mises à jour');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Système unifié de gestion des utilisateurs appliqué avec succès'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});