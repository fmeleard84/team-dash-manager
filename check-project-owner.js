import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDMzNzYsImV4cCI6MjAzODE3OTM3Nn0.B3z3YV65vw3ckLltF94qRT8KHw8XMsQx0T0gs94vxoQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProjects() {
  const clientId = '5023aaa3-5b14-469c-9e05-b011705c7f55';
  
  console.log('Checking projects for client:', clientId);
  
  // Try with user_id
  const { data: byUserId, error: error1 } = await supabase
    .from('projects')
    .select('id, title, user_id, owner_id')
    .eq('user_id', clientId);
  
  console.log('Projects by user_id:', byUserId);
  
  // Try with owner_id  
  const { data: byOwnerId, error: error2 } = await supabase
    .from('projects')
    .select('id, title, user_id, owner_id')
    .eq('owner_id', clientId);
    
  console.log('Projects by owner_id:', byOwnerId);
  
  // Get a sample project to see the structure
  const { data: sample } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
    
  console.log('Sample project structure:', sample);
}

checkProjects();