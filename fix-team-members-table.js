import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjU5MzI0OSwiZXhwIjoyMDM4MTY5MjQ5fQ.9gBVwIIXW3fJB3YH9OobqpQjQUe-5ClW0oKJOQnfGGo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTeamMembersTable() {
  console.log('🔧 Fixing client_team_members table...');
  
  try {
    // First, check if exec_sql function exists
    const checkExecSql = `
      SELECT proname 
      FROM pg_proc 
      WHERE proname = 'exec_sql'
    `;
    
    const { data: execSqlExists, error: checkError } = await supabase
      .rpc('sql_executor', { query: checkExecSql })
      .single();
    
    if (checkError) {
      console.log('❌ exec_sql function not found, creating it...');
      
      // Create exec_sql function if it doesn't exist
      const createExecSql = `
        CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // We can't execute this directly, so we'll need to do it manually
      console.log('\n⚠️  Please run the following SQL in Supabase SQL Editor:\n');
      console.log(createExecSql);
    }
    
    // The SQL to fix the table
    const fixTableSQL = `
      -- Add description column if it doesn't exist
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS description TEXT;
      
      -- Also ensure job_title exists (it's used in the code)
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      
      -- Ensure all necessary columns exist
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS department VARCHAR(255);
    `;
    
    // Try to execute via exec_sql
    const { error: execError } = await supabase.rpc('exec_sql', { sql: fixTableSQL });
    
    if (execError) {
      console.log('\n❌ Could not execute automatically.');
      console.log('⚠️  Please run the following SQL in Supabase SQL Editor:\n');
      console.log('-- Fix client_team_members table');
      console.log(fixTableSQL);
      console.log('\n-- After running the above, your table should be fixed!');
      return;
    }
    
    // Verify the columns exist
    const { data: columns, error: verifyError } = await supabase
      .from('client_team_members')
      .select('*')
      .limit(0);
    
    if (!verifyError) {
      console.log('✅ Table fixed successfully!');
      console.log('✅ All required columns are now present.');
    } else {
      console.log('⚠️  Table might be fixed but could not verify:', verifyError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    // Provide manual SQL as fallback
    console.log('\n📝 Manual Fix Instructions:');
    console.log('Please run the following SQL in your Supabase SQL Editor:\n');
    console.log(`
-- Fix client_team_members table by adding missing columns
ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_team_members'
ORDER BY ordinal_position;
    `);
  }
}

fixTeamMembersTable();