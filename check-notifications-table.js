const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Ula2V5IiwiZXhwIjoxOTgzODEyOTk2fQ.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('=== Checking notifications-related tables ===\n');
  
  // Check if notifications table exists
  const { data: notificationsTable, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);
    
  if (notifError) {
    console.log('❌ Table "notifications" does not exist or error:', notifError.message);
  } else {
    console.log('✅ Table "notifications" exists');
  }
  
  // Check for candidate_notifications table (we know it exists)
  const { data: candidateNotif, error: candidateError } = await supabase
    .from('candidate_notifications')
    .select('*')
    .limit(1);
    
  if (!candidateError) {
    console.log('✅ Table "candidate_notifications" exists');
  }
  
  // Check table structure if notifications exists
  if (!notifError) {
    console.log('\n=== Notifications table structure ===');
    const { data: columns } = await supabase
      .rpc('get_table_columns', { table_name: 'notifications' })
      .single();
    
    if (columns) {
      console.log('Columns:', columns);
    }
  }
  
  // Look for any notification-related tables
  console.log('\n=== All notification-related tables ===');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables_list')
    .single();
    
  if (tables) {
    const notifTables = tables.filter(t => t.includes('notif'));
    console.log('Found tables with "notif":', notifTables);
  }
}

// Try to get schema information directly
async function getSchemaInfo() {
  try {
    // Query information schema
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE '%notif%'
          ORDER BY table_name;
        `
      });
      
    if (data) {
      console.log('\n=== Tables with "notif" in name ===');
      console.log(data);
    }
  } catch (e) {
    console.log('Could not query information schema:', e.message);
  }
}

checkTables().then(() => {
  return getSchemaInfo();
}).catch(console.error);
