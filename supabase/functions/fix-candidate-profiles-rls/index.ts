import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Rendre password_hash optionnel
    const alterResult = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE candidate_profiles 
        ALTER COLUMN password_hash DROP NOT NULL;
      `
    }).single()

    // 2. Supprimer les anciennes politiques RLS
    const dropPolicies = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "candidate_profiles_insert_policy" ON candidate_profiles;
        DROP POLICY IF EXISTS "candidate_profiles_select_policy" ON candidate_profiles;
        DROP POLICY IF EXISTS "candidate_profiles_update_policy" ON candidate_profiles;
      `
    }).single()

    // 3. Créer les nouvelles politiques RLS
    const createPolicies = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Politique pour permettre aux utilisateurs de créer leur propre profil candidat
        CREATE POLICY "Users can create their own candidate profile"
        ON candidate_profiles FOR INSERT
        WITH CHECK (
            auth.email() = email
        );

        -- Politique pour permettre aux utilisateurs de voir leur propre profil
        CREATE POLICY "Users can view their own candidate profile"
        ON candidate_profiles FOR SELECT
        USING (
            auth.email() = email
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
        );

        -- Politique pour permettre aux utilisateurs de modifier leur propre profil
        CREATE POLICY "Users can update their own candidate profile"
        ON candidate_profiles FOR UPDATE
        USING (auth.email() = email)
        WITH CHECK (auth.email() = email);
      `
    }).single()

    // 4. Créer les politiques pour hr_resource_assignments
    const assignmentPolicies = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Supprimer les anciennes politiques
        DROP POLICY IF EXISTS "hr_resource_assignments_select_policy" ON hr_resource_assignments;
        DROP POLICY IF EXISTS "hr_resource_assignments_insert_policy" ON hr_resource_assignments;
        DROP POLICY IF EXISTS "hr_resource_assignments_update_policy" ON hr_resource_assignments;
        DROP POLICY IF EXISTS "hr_resource_assignments_delete_policy" ON hr_resource_assignments;

        -- Politique pour permettre aux candidats de voir leurs propres assignations
        CREATE POLICY "Candidates can view their assignments"
        ON hr_resource_assignments FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM candidate_profiles cp
                WHERE cp.id = hr_resource_assignments.candidate_id
                AND cp.email = auth.email()
            )
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
        );

        -- Politique pour permettre aux admins et clients de créer des assignations
        CREATE POLICY "Admin and clients can create assignments"
        ON hr_resource_assignments FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
        );

        -- Politique pour permettre aux admins et clients de modifier les assignations
        CREATE POLICY "Admin and clients can update assignments"
        ON hr_resource_assignments FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
        );

        -- Politique pour permettre aux admins et clients de supprimer les assignations
        CREATE POLICY "Admin and clients can delete assignments"
        ON hr_resource_assignments FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
        );
      `
    }).single()

    // 5. Créer les politiques pour projects (visibilité pour les candidats)
    const projectPolicies = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Supprimer l'ancienne politique
        DROP POLICY IF EXISTS "projects_select_policy" ON projects;

        -- Créer une nouvelle politique qui permet aux candidats de voir les projets où ils sont assignés
        CREATE POLICY "Users can view relevant projects"
        ON projects FOR SELECT
        USING (
            -- Admins et clients voient tous les projets
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.email = auth.email()
                AND profiles.role IN ('admin', 'client')
            )
            OR
            -- Les candidats voient les projets où ils sont assignés
            EXISTS (
                SELECT 1 FROM hr_resource_assignments hra
                JOIN candidate_profiles cp ON cp.id = hra.candidate_id
                WHERE hra.project_id = projects.id
                AND cp.email = auth.email()
            )
        );
      `
    }).single()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RLS policies updated successfully for candidate profiles and project visibility'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating RLS policies:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})