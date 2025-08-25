import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableRealtime() {
  console.log('🚀 Activation du realtime pour client_team_members...');
  
  try {
    // First check if exec_sql exists
    const { data: execTest, error: execError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1'
    });
    
    if (execError) {
      console.log('exec_sql not available, trying direct approach...');
      
      // Try using the Edge Function
      const { data, error } = await supabase.functions.invoke('enable-team-realtime');
      
      if (error) {
        console.error('❌ Error:', error);
      } else {
        console.log('✅ Result:', data);
      }
      
      return;
    }
    
    // Enable realtime using exec_sql
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        DO $$
        BEGIN
          -- Enable realtime for client_team_members
          ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
          RAISE NOTICE 'Realtime enabled for client_team_members';
        EXCEPTION
          WHEN duplicate_object THEN
            RAISE NOTICE 'Realtime already enabled for client_team_members';
        END $$;
      `
    });

    if (error) {
      console.error('❌ Error enabling realtime:', error);
    } else {
      console.log('✅ Realtime enabled successfully!');
    }
    
    // Verify realtime is enabled
    const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          schemaname,
          tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'client_team_members';
      `
    });
    
    if (!checkError && checkData) {
      console.log('✅ Verification: Realtime is active for client_team_members');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

enableRealtime().catch(console.error);