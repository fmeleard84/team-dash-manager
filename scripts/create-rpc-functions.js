import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY2MzE3OSwiZXhwIjoyMDM4MjM5MTc5fQ.jItJXjPhem5m9YqpOwOZJsCe4SAUsu77tuVIudX9gsU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRPCFunctions() {
  try {
    console.log('🚀 Invoking create-rpc-functions...');
    
    const { data, error } = await supabase.functions.invoke('create-rpc-functions', {
      body: {}
    });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Success:', data);
    }
    
    // Test if functions exist
    console.log('\n🧪 Testing get_project_users...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_project_users', { p_project_id: '16fd6a53-d0ed-49e9-aec6-99813eb23738' });
    
    if (testError) {
      console.error('❌ get_project_users test failed:', testError.message);
    } else {
      console.log('✅ get_project_users works! Found', testData?.length || 0, 'users');
      if (testData && testData.length > 0) {
        console.log('Sample user:', testData[0]);
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createRPCFunctions();