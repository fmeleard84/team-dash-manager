import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjYwMjYzNSwiZXhwIjoyMDM4MTc4NjM1fQ.FgAz-XqnhBOZqDqIus0BUcJXH-d-4U1THCJl9BoYVZI';

const supabase = createClient(supabaseUrl, serviceKey);

async function debug() {
  // Check table structure
  const { data: columns, error: colError } = await supabase
    .rpc('get_columns', { table_name: 'hr_resource_assignments' })
    .single();
  
  if (colError) {
    // Try another approach - get a single row to see structure
    const { data: sample, error: sampleError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('id', 'cc2bff24-4dea-4ab0-90cf-184849031ced')
      .single();
    
    if (sample) {
      console.log('Sample assignment structure:');
      console.log(Object.keys(sample));
      console.log('\nAssignment data:', sample);
    }
  }

  // Check if candidate exists
  const { data: candidate, error: candError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', 'fmeleard+ressource_5@gmail.com')
    .single();
  
  console.log('\nCandidate profile:', candidate ? 'Found' : 'Not found');
  if (candidate) {
    console.log('Candidate ID:', candidate.id);
    console.log('Profile ID:', candidate.profile_id);
    console.log('Seniority:', candidate.seniority);
  }
}

debug();