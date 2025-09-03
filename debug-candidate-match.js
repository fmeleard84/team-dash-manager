import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCandidateMatch() {
  try {
    // Get all candidates with their profiles
    const { data: candidates, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, email, first_name, last_name, profile_id, seniority, status')
      .limit(10);

    if (candidateError) {
      console.error('Error fetching candidates:', candidateError);
      return;
    }

    console.log('Sample candidates:');
    candidates.forEach(c => {
      console.log(`- ${c.first_name} ${c.last_name} (${c.email}): profile_id=${c.profile_id}, seniority=${c.seniority}, status=${c.status}`);
    });

    // Check assignments that candidates can see
    const { data: assignments, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select('id, project_id, profile_id, seniority, booking_status, candidate_id')
      .limit(10);

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      return;
    }

    console.log('\nSample assignments:');
    assignments.forEach(a => {
      console.log(`- Assignment ${a.id}: profile_id=${a.profile_id}, seniority=${a.seniority}, booking_status=${a.booking_status}, candidate_id=${a.candidate_id}`);
    });

    // Find matches
    console.log('\nPotential matches:');
    for (const candidate of candidates) {
      const matchingAssignments = assignments.filter(a => 
        a.profile_id === candidate.profile_id && 
        a.seniority === candidate.seniority &&
        (a.booking_status === 'recherche' || a.candidate_id === candidate.id)
      );
      
      if (matchingAssignments.length > 0) {
        console.log(`\n${candidate.first_name} ${candidate.last_name} (${candidate.email}) can see:`);
        matchingAssignments.forEach(a => {
          console.log(`  - Assignment ${a.id} (status: ${a.booking_status})`);
        });
      }
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugCandidateMatch();