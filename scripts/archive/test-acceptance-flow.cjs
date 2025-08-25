#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjUwMTU0OCwiZXhwIjoyMDM4MDc3NTQ4fQ.R2JB5fYGJMSYQJ8pQvv3CYd9dKjJdqyKK_rkjsxoWsk';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1MDE1NDgsImV4cCI6MjAzODA3NzU0OH0.IlqaWn2Joh7c8JVdpGOJFXc9gg5u8GU6TJ4ND7gwkbY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAcceptanceFlow() {
  console.log('🧪 Testing acceptance flow...\n');
  
  // 1. Find a test candidate and assignment
  const testCandidateEmail = 'fmeleard+ressource_5@gmail.com';
  console.log(`1. Testing with candidate: ${testCandidateEmail}`);
  
  try {
    // Find assignments for this candidate
    const { data: assignments, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        booking_data,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('booking_data->candidate_email', testCandidateEmail)
      .eq('booking_status', 'recherche');

    if (assignmentError) {
      console.error('❌ Error finding assignments:', assignmentError);
      return;
    }

    if (!assignments || assignments.length === 0) {
      console.log('ℹ️  No assignments in "recherche" status found for this candidate');
      
      // Check what assignments exist for this candidate
      const { data: allAssignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          booking_status,
          booking_data,
          projects (
            id,
            title,
            status
          )
        `)
        .eq('booking_data->candidate_email', testCandidateEmail);
      
      console.log('📊 All assignments for this candidate:', allAssignments);
      return;
    }

    const assignment = assignments[0];
    console.log(`2. Found assignment ${assignment.id} for project "${assignment.projects.title}"`);
    console.log(`   Project status: ${assignment.projects.status}`);
    console.log(`   Assignment status: ${assignment.booking_status}`);
    
    // 2. Test the acceptance via edge function
    console.log('\n3. Testing acceptance via edge function...');
    
    const { data: acceptResponse, error: acceptError } = await supabase.functions.invoke('resource-booking', {
      body: {
        action: 'accept_mission',
        assignment_id: assignment.id,
        candidate_email: testCandidateEmail
      }
    });

    if (acceptError) {
      console.error('❌ Error accepting mission:', acceptError);
      return;
    }

    console.log('✅ Acceptance response:', acceptResponse);

    // 3. Verify the changes
    console.log('\n4. Verifying changes...');
    
    // Check assignment status
    const { data: updatedAssignment } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status, booking_data')
      .eq('id', assignment.id)
      .single();

    console.log('📋 Updated assignment status:', updatedAssignment?.booking_status);
    
    // Check project status
    const { data: updatedProject } = await supabase
      .from('projects')
      .select('status')
      .eq('id', assignment.project_id)
      .single();

    console.log('📊 Updated project status:', updatedProject?.status);

    // Check if all assignments for this project are now accepted
    const { data: allProjectAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status')
      .eq('project_id', assignment.project_id);

    const allAccepted = allProjectAssignments?.every(a => a.booking_status === 'accepted');
    const anyAccepted = allProjectAssignments?.some(a => a.booking_status === 'accepted');
    
    console.log(`📈 Project assignments: ${allProjectAssignments?.length} total`);
    console.log(`   - All accepted: ${allAccepted}`);
    console.log(`   - Any accepted: ${anyAccepted}`);
    
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAcceptanceFlow().then(() => {
  console.log('\n🏁 Test finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});