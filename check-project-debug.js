import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject() {
  const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';
  
  console.log('🔍 Checking project:', projectId);
  
  // 1. Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (projectError) {
    console.error('❌ Project error:', projectError);
    return;
  }
  
  console.log('\n📋 Project:', {
    id: project.id,
    title: project.title,
    status: project.status,
    owner_id: project.owner_id
  });
  
  // 2. Get assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      profile_id,
      seniority,
      booking_status,
      candidate_id
    `)
    .eq('project_id', projectId);
  
  if (assignmentsError) {
    console.error('❌ Assignments error:', assignmentsError);
    return;
  }
  
  console.log(`\n📊 Found ${assignments.length} assignments:`);
  for (const assignment of assignments) {
    console.log(`  Assignment ${assignment.id}:`, {
      profile_id: assignment.profile_id,
      seniority: assignment.seniority,
      booking_status: assignment.booking_status,
      candidate_id: assignment.candidate_id || 'NULL'
    });
    
    // Check if candidate exists
    if (assignment.candidate_id) {
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, status')
        .eq('id', assignment.candidate_id)
        .single();
      
      if (candidate) {
        console.log(`    ✅ Candidate found: ${candidate.first_name} ${candidate.last_name} (status: ${candidate.status})`);
      } else {
        console.log(`    ❌ Candidate ID ${assignment.candidate_id} NOT FOUND in candidate_profiles!`);
      }
    } else {
      // Try to find candidates by profile/seniority
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, status')
        .eq('profile_id', assignment.profile_id)
        .eq('seniority', assignment.seniority);
      
      console.log(`    🔍 Found ${candidates?.length || 0} candidates matching profile ${assignment.profile_id} + seniority ${assignment.seniority}`);
      if (candidates && candidates.length > 0) {
        candidates.forEach(c => {
          console.log(`      - ${c.first_name} ${c.last_name} (id: ${c.id}, status: ${c.status})`);
        });
      }
    }
  }
  
  // 3. Summary
  const acceptedCount = assignments.filter(a => a.booking_status === 'accepted').length;
  const withCandidateId = assignments.filter(a => a.candidate_id).length;
  
  console.log('\n📈 Summary:');
  console.log('  - Total assignments:', assignments.length);
  console.log('  - Accepted assignments:', acceptedCount);
  console.log('  - Assignments with candidate_id:', withCandidateId);
  console.log('  - Can start project:', acceptedCount > 0);
}

checkProject().catch(console.error);