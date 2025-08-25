import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzkwNTc5OX0.7LBnJqMrt4WbmL6qUcH0jzVJnCw-9nu0sGQYu1u6wLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkTeamMemberToProject() {
  console.log('🔧 Creating function to link team members to projects...');

  const sql = `
    -- Function to automatically link team member to project when added
    CREATE OR REPLACE FUNCTION link_team_member_to_project(
      p_member_id UUID,
      p_project_id UUID
    )
    RETURNS VOID AS $$
    BEGIN
      -- Insert or update the link between team member and project
      INSERT INTO team_member_projects (
        team_member_id, 
        project_id, 
        role
      )
      VALUES (
        p_member_id, 
        p_project_id, 
        'member'
      )
      ON CONFLICT (team_member_id, project_id) 
      DO UPDATE SET updated_at = NOW();
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION link_team_member_to_project TO authenticated;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error creating function:', error);
      return;
    }

    console.log('✅ Function created successfully!');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

linkTeamMemberToProject();