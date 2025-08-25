import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableRealtimeForTimeTracking() {
  console.log('🔄 Enabling realtime for time tracking tables...\n');

  try {
    // First, check current realtime tables
    const checkQuery = `
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
      AND tablename IN ('active_time_tracking', 'time_tracking_sessions')
      ORDER BY tablename;
    `;

    const { data: currentTables, error: checkError } = await supabase.rpc('exec_sql', {
      sql_query: checkQuery
    }).single();

    if (checkError) {
      console.error('❌ Error checking current tables:', checkError);
    } else {
      const tables = JSON.parse(currentTables || '[]');
      console.log('📋 Currently enabled for realtime:', tables.length > 0 ? tables : 'None');
    }

    // Enable realtime for both tables
    const enableQueries = [
      `DO $$ 
      BEGIN
        -- Remove if exists
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS active_time_tracking;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS time_tracking_sessions;
        
        -- Add fresh
        ALTER PUBLICATION supabase_realtime ADD TABLE active_time_tracking;
        ALTER PUBLICATION supabase_realtime ADD TABLE time_tracking_sessions;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error enabling realtime: %', SQLERRM;
      END $$;`
    ];

    for (const query of enableQueries) {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: query
      }).single();

      if (error) {
        console.error('❌ Error executing query:', error);
      } else {
        console.log('✅ Successfully enabled realtime');
      }
    }

    // Verify the changes
    const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: checkQuery
    }).single();

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
    } else {
      const enabledTables = JSON.parse(verifyData || '[]');
      console.log('\n✅ Final state - Tables enabled for realtime:', enabledTables);
    }

    // Also check if the tables exist
    const existQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('active_time_tracking', 'time_tracking_sessions')
      ORDER BY table_name;
    `;

    const { data: existData, error: existError } = await supabase.rpc('exec_sql', {
      sql_query: existQuery
    }).single();

    if (!existError && existData) {
      const existingTables = JSON.parse(existData);
      console.log('📊 Tables that exist in database:', existingTables);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
enableRealtimeForTimeTracking();