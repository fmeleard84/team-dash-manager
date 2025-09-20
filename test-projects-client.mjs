import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q'
);

async function test() {
  // Get a client user ID
  const { data: clientProfile } = await supabase
    .from('client_profiles')
    .select('id')
    .limit(1)
    .single();

  if (!clientProfile) {
    console.log('No client profiles found');
    return;
  }

  console.log('Testing with client ID:', clientProfile.id);

  // Test direct query like we use now
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', clientProfile.id)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nProjects found:', projects?.length || 0);

  if (projects && projects.length > 0) {
    projects.forEach((p, i) => {
      console.log(`\nProject ${i + 1}:`);
      console.log('  id:', p.id);
      console.log('  title:', p.title);
      console.log('  status:', p.status);
      console.log('  created_at:', p.created_at);
    });
  }

  // Also test RPC function
  const { data: user } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', clientProfile.id)
    .single();

  if (user?.email) {
    const { data: rpcProjects } = await supabase
      .rpc('get_user_projects', { user_email: user.email });

    console.log('\nRPC Projects found:', rpcProjects?.length || 0);
    if (rpcProjects && rpcProjects.length > 0) {
      console.log('RPC first project:', rpcProjects[0]);
    }
  }
}

test();