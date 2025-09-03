import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealAcceptMission() {
  try {
    // First, let's find a real assignment that's in 'recherche' status
    const { data: assignments, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('booking_status', 'recherche')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching assignments:', fetchError);
      return;
    }

    console.log('Found assignments with recherche status:', assignments);

    if (!assignments || assignments.length === 0) {
      console.log('No assignments in recherche status found');
      
      // Let's check what statuses exist
      const { data: allAssignments, error: allError } = await supabase
        .from('hr_resource_assignments')
        .select('id, booking_status, project_id, profile_id, seniority')
        .limit(5);
      
      console.log('Sample assignments:', allAssignments);
      return;
    }

    // Get a test candidate email
    const testAssignment = assignments[0];
    console.log('Testing with assignment:', testAssignment);

    // Find a matching candidate
    const { data: candidates, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('email')
      .eq('profile_id', testAssignment.profile_id)
      .eq('seniority', testAssignment.seniority)
      .limit(1);

    if (candidateError || !candidates || candidates.length === 0) {
      console.log('No matching candidate found for this assignment');
      return;
    }

    const testCandidateEmail = candidates[0].email;
    console.log('Using candidate email:', testCandidateEmail);

    // Now test the Edge Function
    const { data, error } = await supabase.functions.invoke('resource-booking', {
      body: {
        action: 'accept_mission',
        assignment_id: testAssignment.id,
        candidate_email: testCandidateEmail
      }
    });

    console.log('Edge Function response:', { data, error });
  } catch (error) {
    console.error('Test error:', error);
  }
}

testRealAcceptMission();