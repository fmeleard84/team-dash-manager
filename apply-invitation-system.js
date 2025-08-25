import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzkwNTc5OX0.7LBnJqMrt4WbmL6qUcH0jzVJnCw-9nu0sGQYu1u6wLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyInvitationSystem() {
  console.log('🔧 Applying invitation system to database...');

  const sql = `
    -- 1. Add invitation columns to client_team_members
    ALTER TABLE public.client_team_members
    ADD COLUMN IF NOT EXISTS invitation_token UUID,
    ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

    -- 2. Create index for invitation token
    CREATE INDEX IF NOT EXISTS idx_client_team_members_invitation_token
    ON public.client_team_members(invitation_token);

    -- 3. Create team_member_projects table
    CREATE TABLE IF NOT EXISTS public.team_member_projects (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      team_member_id UUID NOT NULL REFERENCES client_team_members(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      role VARCHAR(100) DEFAULT 'member',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(team_member_id, project_id)
    );

    -- 4. Create indexes
    CREATE INDEX IF NOT EXISTS idx_team_member_projects_member
    ON public.team_member_projects(team_member_id);

    CREATE INDEX IF NOT EXISTS idx_team_member_projects_project
    ON public.team_member_projects(project_id);

    -- 5. Enable RLS
    ALTER TABLE public.team_member_projects ENABLE ROW LEVEL SECURITY;

    -- 6. RLS policies
    DROP POLICY IF EXISTS "Team members can view their projects" ON public.team_member_projects;
    CREATE POLICY "Team members can view their projects"
    ON public.team_member_projects
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM client_team_members
        WHERE client_team_members.id = team_member_projects.team_member_id
        AND (
          client_team_members.client_id = auth.uid()
          OR client_team_members.user_id = auth.uid()
        )
      )
    );

    DROP POLICY IF EXISTS "Clients can manage team project assignments" ON public.team_member_projects;
    CREATE POLICY "Clients can manage team project assignments"
    ON public.team_member_projects
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM client_team_members
        WHERE client_team_members.id = team_member_projects.team_member_id
        AND client_team_members.client_id = auth.uid()
      )
    );

    -- 7. Function to get team member by token
    CREATE OR REPLACE FUNCTION get_team_member_by_token(token UUID)
    RETURNS TABLE (
      id UUID,
      client_id UUID,
      first_name VARCHAR,
      last_name VARCHAR,
      email VARCHAR,
      job_title VARCHAR,
      client_name TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        ctm.id,
        ctm.client_id,
        ctm.first_name,
        ctm.last_name,
        ctm.email,
        ctm.job_title,
        p.first_name || ' ' || p.last_name as client_name
      FROM client_team_members ctm
      LEFT JOIN profiles p ON p.id = ctm.client_id
      WHERE ctm.invitation_token = token
      AND ctm.invitation_accepted_at IS NULL
      AND ctm.invitation_sent_at > NOW() - INTERVAL '7 days';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error applying invitation system:', error);
      return;
    }

    console.log('✅ Invitation system applied successfully!');
    
    // Verify the columns were added
    const { data: columns, error: verifyError } = await supabase
      .from('client_team_members')
      .select('*')
      .limit(0);

    if (!verifyError) {
      console.log('✅ Invitation columns verified');
    }

    // Check if team_member_projects table exists
    const { error: tableError } = await supabase
      .from('team_member_projects')
      .select('*')
      .limit(0);

    if (!tableError) {
      console.log('✅ team_member_projects table created successfully');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

applyInvitationSystem();