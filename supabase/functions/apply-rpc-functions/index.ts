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

    console.log('🚀 Applying RPC functions...');
    
    // Créer la fonction get_project_users
    const sql1 = `
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
      
      -- Candidats assignés avec candidate_id
      SELECT 
        cp.id as user_id,
        cp.email,
        COALESCE(prof.first_name, SPLIT_PART(cp.email, '@', 1)) as display_name,
        COALESCE(cp.job_title, 'Consultant') as job_title,
        'candidate'::TEXT as role,
        hra.created_at as joined_at
      FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      LEFT JOIN profiles prof ON prof.id = cp.profile_id
      WHERE hra.project_id = p_project_id
      AND hra.booking_status IN ('accepted', 'booké')
      AND hra.candidate_id IS NOT NULL
      
      ORDER BY 
        CASE role 
          WHEN 'client' THEN 1 
          WHEN 'candidate' THEN 2 
          ELSE 3 
        END,
        display_name;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const { error: error1 } = await supabase.rpc('exec_sql', { sql_query: sql1 });
    if (error1) {
      console.error('Error creating get_project_users:', error1);
    } else {
      console.log('✅ get_project_users created');
    }

    // Créer la fonction get_user_projects
    const sql2 = `
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
      
      -- Projets où l'utilisateur est candidat via candidate_id
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
      AND hra.candidate_id IS NOT NULL
      
      ORDER BY created_at DESC;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const { error: error2 } = await supabase.rpc('exec_sql', { sql_query: sql2 });
    if (error2) {
      console.error('Error creating get_user_projects:', error2);
    } else {
      console.log('✅ get_user_projects created');
    }

    // Donner les permissions
    const sql3 = `
    GRANT EXECUTE ON FUNCTION get_project_users(UUID) TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION get_user_projects(TEXT) TO anon, authenticated;`;

    const { error: error3 } = await supabase.rpc('exec_sql', { sql_query: sql3 });
    if (error3) {
      console.error('Error granting permissions:', error3);
    } else {
      console.log('✅ Permissions granted');
    }

    // Tester les fonctions
    console.log('🧪 Testing functions...');
    
    const { data: testData, error: testError } = await supabase
      .rpc('get_project_users', { p_project_id: '16fd6a53-d0ed-49e9-aec6-99813eb23738' });
    
    if (testError) {
      console.error('Test failed:', testError);
    } else {
      console.log('✅ Test successful! Found', testData?.length || 0, 'users');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RPC functions created successfully',
        testResult: testData?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
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