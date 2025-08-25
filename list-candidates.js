import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjI0OTIyNSwiZXhwIjoyMDM3ODI1MjI1fQ.tpbICL5m4fSm5T-ow7s0PO1SyJKdEmZNvocRuNalgrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listCandidates() {
  console.log('📋 Liste des candidats:\n');
  
  // 1. List all profiles with type = 'candidate'
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, user_type')
    .eq('user_type', 'candidate');
  
  console.log('👥 Profiles avec type "candidate":');
  profiles?.forEach(p => {
    console.log(`  - ${p.first_name} ${p.last_name} (${p.email})`);
    console.log(`    ID: ${p.id}`);
  });
  
  // 2. List all candidate_profiles
  const { data: candidateProfiles } = await supabase
    .from('candidate_profiles')
    .select('*');
  
  console.log('\n📝 Candidate profiles:');
  candidateProfiles?.forEach(cp => {
    console.log(`  - Email: ${cp.email}`);
    console.log(`    ID: ${cp.id}`);
    console.log(`    Profile ID: ${cp.profile_id}`);
    console.log(`    Seniority: ${cp.seniority}`);
  });
  
  // 3. List all hr_resource_assignments
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (title, status)
    `);
  
  console.log('\n📊 Assignments:');
  assignments?.forEach(a => {
    console.log(`  - Projet: ${a.projects?.title}`);
    console.log(`    Profile ID: ${a.profile_id}`);
    console.log(`    Candidate ID: ${a.candidate_id}`);
    console.log(`    Seniority: ${a.seniority}`);
    console.log(`    Booking Status: ${a.booking_status}`);
  });
}

listCandidates().catch(console.error);