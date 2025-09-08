import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function checkProfiles() {
  // Test basique
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Sample profile:', data);
  }
  
  // Test avec ID spécifique
  const testId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', testId)
    .single();
    
  if (profileError) {
    console.error('Error fetching specific profile:', profileError);
  } else {
    console.log('Specific profile:', profile);
  }
  
  // Test avec in()
  const { data: profiles, error: inError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', [testId]);
    
  if (inError) {
    console.error('Error with in() query:', inError);
  } else {
    console.log('Profiles with in():', profiles);
  }
}

checkProfiles();