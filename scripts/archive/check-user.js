import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTM4NzQsImV4cCI6MjAzODE2OTg3NH0.V46sINZHShqwFD5fP0xEA2ZDBE4qziqVQJJzubQD0ZE';

const supabase = createClient(supabaseUrl, supabaseKey);

const checkUser = async () => {
  const email = 'fmeleard+client_5@gmail.com';
  
  console.log('Checking user profile for:', email);
  
  // Check profiles table
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);
    
  console.log('Profiles found:', profiles);
  if (profileError) console.error('Profile error:', profileError);
  
  // Try to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'test123' // You'll need to use the correct password
  });
  
  if (signInError) {
    console.error('Sign in error:', signInError);
  } else {
    console.log('Sign in successful:', signInData.user?.id);
    console.log('User confirmed:', signInData.user?.email_confirmed_at);
  }
};

checkUser();