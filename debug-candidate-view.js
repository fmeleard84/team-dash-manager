import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.4BRPKfKdLSi_6VuVVYscYQY7JajN4CJvPaOhNHPKyhM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCandidateView() {
  const candidateEmail = 'fmeleard+ressource_2@gmail.com';
  
  console.log('🔍 DEBUG CANDIDATE VIEW');
  console.log('=====================================\n');
  
  // 1. Get candidate profile
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
  
  if (!candidate) {
    console.log('❌ Candidate not found');
    return;
  }
  
  console.log('👤 Candidate:');
  console.log('  ID:', candidate.id);
  console.log('  Profile ID:', candidate.profile_id);
  console.log('  Seniority:', candidate.seniority);
  console.log('  Status:', candidate.status);
  
  // 2. Get all assignments matching profile
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        status
      )
    `)
    .eq('profile_id', candidate.profile_id)
    .eq('seniority', candidate.seniority);
  
  console.log(`\n📋 Total assignments matching profile/seniority: ${allAssignments?.length || 0}`);
  
  if (allAssignments && allAssignments.length > 0) {
    console.log('\nDETAILS OF EACH ASSIGNMENT:');
    console.log('----------------------------');
    
    allAssignments.forEach((a, index) => {
      console.log(`\n${index + 1}. Project: "${a.projects?.title}"`);
      console.log(`   Assignment ID: ${a.id}`);
      console.log(`   Booking Status: ${a.booking_status}`);
      console.log(`   Candidate ID: ${a.candidate_id || 'NULL (not assigned)'}`);
      console.log(`   Project Status: ${a.projects?.status}`);
      
      // Determine if should be visible
      const shouldBeVisible = !a.candidate_id || a.candidate_id === candidate.id;
      const isInSearchMode = a.booking_status === 'recherche' || a.booking_status === 'draft';
      
      console.log(`   → Should be visible: ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
      console.log(`   → Is searchable: ${isInSearchMode ? '✅ YES' : '❌ NO'}`);
      console.log(`   → Final visibility: ${shouldBeVisible && isInSearchMode ? '✅ SHOW' : '❌ HIDE'}`);
    });
  }
  
  // 3. Check what the component would show
  console.log('\n=====================================');
  console.log('WHAT THE CANDIDATE SHOULD SEE:');
  console.log('----------------------------');
  
  const visibleAssignments = allAssignments?.filter(a => {
    const notAssignedToOthers = !a.candidate_id || a.candidate_id === candidate.id;
    const isSearchable = a.booking_status === 'recherche' || a.booking_status === 'draft';
    return notAssignedToOthers && isSearchable;
  }) || [];
  
  console.log(`\n✅ Visible assignments: ${visibleAssignments.length}`);
  visibleAssignments.forEach(a => {
    console.log(`  - ${a.projects?.title} (${a.booking_status})`);
  });
  
  // 4. Check if there are assignments incorrectly assigned
  const incorrectlyVisible = allAssignments?.filter(a => {
    return a.candidate_id && a.candidate_id !== candidate.id;
  }) || [];
  
  if (incorrectlyVisible.length > 0) {
    console.log(`\n❌ PROBLEM: ${incorrectlyVisible.length} assignments are assigned to OTHER candidates:`);
    incorrectlyVisible.forEach(a => {
      console.log(`  - ${a.projects?.title} is assigned to candidate ${a.candidate_id}`);
    });
  }
}

debugCandidateView().catch(console.error);