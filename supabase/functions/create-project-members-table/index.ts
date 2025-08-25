import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log('🔨 Creating project_members table and migrating data...');

    // 1. Create the table
    const createTableSQL = `
      -- Create table if not exists
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        user_email TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('client', 'candidate')),
        display_name TEXT NOT NULL,
        job_title TEXT,
        role TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, user_email)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);
    `;

    await supabaseClient.rpc('exec_sql', { sql_query: createTableSQL });
    console.log('✅ Table created');

    // 2. Enable RLS
    const rlsSQL = `
      ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can view project members" ON project_members;
      CREATE POLICY "Users can view project members" ON project_members
        FOR SELECT
        USING (true); -- Temporairement ouvert pour le test
    `;

    await supabaseClient.rpc('exec_sql', { sql_query: rlsSQL });
    console.log('✅ RLS enabled');

    // 3. Migrate clients
    const migrateClientsSQL = `
      INSERT INTO project_members (
        project_id, user_id, user_email, user_type, display_name, job_title, role, status
      )
      SELECT DISTINCT
        p.id,
        p.owner_id,
        prof.email,
        'client',
        COALESCE(prof.first_name, SPLIT_PART(prof.email, '@', 1)),
        'Client',
        'owner',
        'active'
      FROM projects p
      JOIN profiles prof ON prof.id = p.owner_id
      ON CONFLICT (project_id, user_email) DO NOTHING;
    `;

    await supabaseClient.rpc('exec_sql', { sql_query: migrateClientsSQL });
    console.log('✅ Clients migrated');

    // 4. Migrate candidates
    const migrateCandidatesSQL = `
      INSERT INTO project_members (
        project_id, user_id, user_email, user_type, display_name, job_title, role, status
      )
      SELECT DISTINCT
        hra.project_id,
        COALESCE(hra.candidate_id, hra.profile_id),
        COALESCE(cp.email, hp.name || '@temp.com'),
        'candidate',
        COALESCE(
          cp.first_name,
          SPLIT_PART(hp.name, ' ', 1),
          SPLIT_PART(cp.email, '@', 1),
          'Candidat'
        ),
        COALESCE(hra.job_title, cp.job_title, hp.job_title, 'Consultant'),
        'member',
        CASE 
          WHEN hra.booking_status IN ('accepted', 'booké') THEN 'active'
          ELSE 'pending'
        END
      FROM hr_resource_assignments hra
      LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
      WHERE hra.project_id IS NOT NULL
      ON CONFLICT (project_id, user_email) DO UPDATE SET
        status = EXCLUDED.status,
        job_title = EXCLUDED.job_title;
    `;

    await supabaseClient.rpc('exec_sql', { sql_query: migrateCandidatesSQL });
    console.log('✅ Candidates migrated');

    // 5. Get statistics
    const { data: stats } = await supabaseClient
      .from('project_members')
      .select('*');

    const { data: projectExample } = await supabaseClient
      .from('project_members')
      .select('*')
      .eq('project_id', '16fd6a53-d0ed-49e9-aec6-99813eb23738');

    const result = {
      success: true,
      message: 'Project members table created and data migrated',
      stats: {
        total_members: stats?.length || 0,
        clients: stats?.filter(m => m.user_type === 'client').length || 0,
        candidates: stats?.filter(m => m.user_type === 'candidate').length || 0,
        active: stats?.filter(m => m.status === 'active').length || 0,
        pending: stats?.filter(m => m.status === 'pending').length || 0
      },
      example_project: {
        project_id: '16fd6a53-d0ed-49e9-aec6-99813eb23738',
        members: projectExample?.map(m => ({
          name: m.display_name,
          job: m.job_title,
          type: m.user_type,
          status: m.status
        }))
      }
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})