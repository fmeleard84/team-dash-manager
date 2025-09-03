import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAssignment() {
  const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';
  const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com';
  
  console.log('🔧 Fixing assignment for project:', projectId);
  console.log('👤 Candidate:', candidateEmail);
  
  // Get candidate ID
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('id, profile_id, seniority')
    .eq('email', candidateEmail)
    .single();
  
  if (!candidate) {
    console.error('❌ Candidate not found!');
    return;
  }
  
  console.log('✅ Found candidate:', {
    id: candidate.id,
    profile_id: candidate.profile_id,
    seniority: candidate.seniority
  });
  
  // Find the assignment that should match this candidate
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', projectId)
    .eq('booking_status', 'accepted');
  
  console.log('\n📋 Current accepted assignments:');
  for (const assignment of assignments || []) {
    console.log(`  Assignment ${assignment.id}:`);
    console.log('    - Profile:', assignment.profile_id);
    console.log('    - Seniority:', assignment.seniority);
    console.log('    - Candidate ID:', assignment.candidate_id || 'NULL');
    
    // Check if this could be for our candidate
    if (assignment.profile_id === candidate.profile_id && 
        assignment.seniority === candidate.seniority) {
      console.log('    🎯 This SHOULD be for our candidate!');
      
      if (!assignment.candidate_id) {
        console.log('    🔧 Updating assignment with candidate_id...');
        
        const { error } = await supabase
          .from('hr_resource_assignments')
          .update({ candidate_id: candidate.id })
          .eq('id', assignment.id);
        
        if (error) {
          console.error('    ❌ Update failed:', error.message);
        } else {
          console.log('    ✅ Assignment updated successfully!');
        }
      }
    }
  }
  
  // But there's a problem: the assignment has a different profile_id
  // We need to find which assignment is actually for this candidate
  console.log('\n⚠️  NOTE: The assignment profile_id (922efb64-...) does not match');
  console.log('     the candidate profile_id (86591b70-...).');
  console.log('     This means the candidate accepted a mission for a different profile.');
  console.log('     We need to update the first NULL candidate_id assignment.');
  
  // Update the first assignment with NULL candidate_id
  const nullAssignment = assignments?.find(a => !a.candidate_id);
  if (nullAssignment) {
    console.log('\n🔧 Updating assignment', nullAssignment.id, 'with candidate_id...');
    
    const { error } = await supabase
      .from('hr_resource_assignments')
      .update({ candidate_id: candidate.id })
      .eq('id', nullAssignment.id);
    
    if (error) {
      console.error('❌ Update failed:', error.message);
    } else {
      console.log('✅ Assignment linked to candidate successfully!');
    }
  }
}

fixAssignment().catch(console.error);