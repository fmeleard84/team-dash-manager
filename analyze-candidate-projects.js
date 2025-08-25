import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.4BRPKfKdLSi_6VuVVYscYQY7JajN4CJvPaOhNHPKyhM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCandidateProjects() {
  const candidateEmail = 'fmeleard+ressource_2@gmail.com';
  
  console.log('🔍 Analyzing candidate:', candidateEmail);
  console.log('=====================================\n');
  
  // 1. Get candidate profile
  const { data: candidate, error: candError } = await supabase
    .from('candidate_profiles')
    .select(`
      *,
      hr_profiles!inner (
        name,
        category_id,
        is_ai
      )
    `)
    .eq('email', candidateEmail)
    .single();
  
  if (candError || !candidate) {
    console.error('❌ Candidate not found:', candError);
    return;
  }
  
  console.log('👤 CANDIDATE PROFILE:');
  console.log('  ID:', candidate.id);
  console.log('  Email:', candidate.email);
  console.log('  Profile ID:', candidate.profile_id);
  console.log('  Profession:', candidate.hr_profiles?.name);
  console.log('  Seniority:', candidate.seniority);
  console.log('  Status:', candidate.status);
  console.log('  Is AI:', candidate.hr_profiles?.is_ai || false);
  
  // 2. Get candidate languages
  const { data: languages } = await supabase
    .from('candidate_languages')
    .select('hr_languages(id, name)')
    .eq('candidate_id', candidate.id);
  
  const candidateLanguages = languages?.map(l => l.hr_languages?.name) || [];
  console.log('  Languages:', candidateLanguages.join(', ') || 'None');
  
  // 3. Get candidate expertises
  const { data: expertises } = await supabase
    .from('candidate_expertises')
    .select('hr_expertises(id, name)')
    .eq('candidate_id', candidate.id);
  
  const candidateExpertises = expertises?.map(e => e.hr_expertises?.name) || [];
  console.log('  Expertises:', candidateExpertises.join(', ') || 'None');
  
  console.log('\n=====================================');
  console.log('📋 CHECKING PROJECT ASSIGNMENTS:\n');
  
  // 4. Get ALL resource assignments that match this profile
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      seniority,
      languages,
      expertises,
      booking_status,
      candidate_id,
      created_at,
      projects!inner (
        id,
        title,
        status,
        created_at
      ),
      hr_profiles!inner (
        name
      )
    `)
    .eq('profile_id', candidate.profile_id)
    .eq('seniority', candidate.seniority);
  
  console.log(`Found ${allAssignments?.length || 0} assignments for this profile/seniority combo:\n`);
  
  if (allAssignments && allAssignments.length > 0) {
    for (const assignment of allAssignments) {
      console.log(`📁 Project: ${assignment.projects.title}`);
      console.log(`   Assignment ID: ${assignment.id}`);
      console.log(`   Project Status: ${assignment.projects.status}`);
      console.log(`   Booking Status: ${assignment.booking_status}`);
      console.log(`   Required Languages: ${assignment.languages?.join(', ') || 'None'}`);
      console.log(`   Required Expertises: ${assignment.expertises?.join(', ') || 'None'}`);
      console.log(`   Assigned Candidate ID: ${assignment.candidate_id || 'NOT ASSIGNED'}`);
      console.log(`   Created: ${new Date(assignment.created_at).toLocaleString()}`);
      
      // Check if candidate qualifies
      const hasRequiredLanguages = !assignment.languages || assignment.languages.length === 0 ||
        assignment.languages.every(lang => candidateLanguages.includes(lang));
      const hasRequiredExpertises = !assignment.expertises || assignment.expertises.length === 0 ||
        assignment.expertises.every(exp => candidateExpertises.includes(exp));
      
      console.log(`   ✓ Has required languages: ${hasRequiredLanguages}`);
      console.log(`   ✓ Has required expertises: ${hasRequiredExpertises}`);
      
      // Determine visibility
      let shouldBeVisible = false;
      let reason = '';
      
      if (assignment.candidate_id === candidate.id) {
        shouldBeVisible = true;
        reason = 'Specifically assigned to this candidate';
      } else if (assignment.candidate_id) {
        shouldBeVisible = false;
        reason = 'Assigned to another candidate';
      } else if (assignment.booking_status === 'recherche' && hasRequiredLanguages && hasRequiredExpertises && candidate.status === 'disponible') {
        shouldBeVisible = true;
        reason = 'Available and candidate qualifies';
      } else if (assignment.booking_status !== 'recherche') {
        shouldBeVisible = false;
        reason = `Status is ${assignment.booking_status}, not 'recherche'`;
      } else if (candidate.status !== 'disponible') {
        shouldBeVisible = false;
        reason = 'Candidate is not disponible';
      } else {
        shouldBeVisible = false;
        reason = 'Candidate does not meet requirements';
      }
      
      console.log(`   🎯 Should be visible: ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
      console.log(`   Reason: ${reason}`);
      console.log('');
    }
  }
  
  console.log('\n=====================================');
  console.log('📊 SUMMARY:\n');
  
  // 5. Get what the candidate currently sees (simulating the hook logic)
  const { data: acceptedAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (*)
    `)
    .eq('candidate_id', candidate.id)
    .in('booking_status', ['accepted', 'booké']);
  
  console.log(`Accepted projects (should always be visible): ${acceptedAssignments?.length || 0}`);
  if (acceptedAssignments) {
    acceptedAssignments.forEach(a => console.log(`  - ${a.projects?.title}`));
  }
  
  // Check available projects (using current broken logic)
  const { data: brokenLogic } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (*)
    `)
    .eq('profile_id', candidate.profile_id)
    .eq('seniority', candidate.seniority)
    .in('booking_status', ['recherche', 'draft']);
  
  console.log(`\nProjects shown with CURRENT logic (profile_id + seniority): ${brokenLogic?.length || 0}`);
  if (brokenLogic) {
    brokenLogic.forEach(a => console.log(`  - ${a.projects?.title} (candidate_id: ${a.candidate_id || 'null'})`));
  }
  
  // Check what should be shown with correct logic
  const { data: correctLogic } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (*)
    `)
    .or(`candidate_id.eq.${candidate.id},and(candidate_id.is.null,booking_status.eq.recherche,profile_id.eq.${candidate.profile_id},seniority.eq.${candidate.seniority})`);
  
  console.log(`\nProjects that SHOULD be shown with CORRECT logic: ${correctLogic?.length || 0}`);
  if (correctLogic) {
    for (const a of correctLogic) {
      const hasLangs = !a.languages || a.languages.every(l => candidateLanguages.includes(l));
      const hasExps = !a.expertises || a.expertises.every(e => candidateExpertises.includes(e));
      if (hasLangs && hasExps) {
        console.log(`  - ${a.projects?.title} (qualifies: YES)`);
      } else {
        console.log(`  - ${a.projects?.title} (qualifies: NO - missing requirements)`);
      }
    }
  }
  
  console.log('\n=====================================');
  console.log('🔧 PROBLEM IDENTIFIED:\n');
  console.log('The frontend is NOT checking if candidate_id is null.');
  console.log('It shows ALL assignments with matching profile_id + seniority,');
  console.log('even those already assigned to OTHER candidates.\n');
  console.log('SOLUTION: Add candidate_id filtering in CandidateMissionRequests.tsx');
}

analyzeCandidateProjects().catch(console.error);