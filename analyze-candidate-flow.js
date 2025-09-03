import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCandidate() {
  const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com';
  const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';
  
  console.log('🔍 Analysing candidate flow for:', candidateEmail);
  console.log('📋 Project ID:', projectId);
  console.log('='*60);
  
  // 1. Check if candidate exists in candidate_profiles
  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
  
  if (candidateError) {
    console.error('❌ Candidate not found in candidate_profiles:', candidateError.message);
  } else {
    console.log('\n✅ CANDIDATE PROFILE FOUND:');
    console.log('  - ID:', candidateProfile.id);
    console.log('  - Name:', candidateProfile.first_name, candidateProfile.last_name);
    console.log('  - Email:', candidateProfile.email);
    console.log('  - Profile ID:', candidateProfile.profile_id);
    console.log('  - Seniority:', candidateProfile.seniority);
    console.log('  - Status:', candidateProfile.status);
    console.log('  - Email verified:', candidateProfile.is_email_verified);
  }
  
  // 2. Check all resource assignments for this project
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', projectId);
  
  console.log('\n📊 ALL PROJECT ASSIGNMENTS:');
  for (const assignment of allAssignments || []) {
    console.log(`\n  Assignment ${assignment.id}:`);
    console.log('    - Profile ID:', assignment.profile_id);
    console.log('    - Seniority:', assignment.seniority);
    console.log('    - Booking Status:', assignment.booking_status);
    console.log('    - Candidate ID:', assignment.candidate_id || 'NULL');
    
    // Check if this could match our candidate
    if (candidateProfile && 
        assignment.profile_id === candidateProfile.profile_id && 
        assignment.seniority === candidateProfile.seniority) {
      console.log('    🎯 THIS COULD MATCH OUR CANDIDATE!');
      if (!assignment.candidate_id) {
        console.log('    ⚠️  BUT candidate_id is NULL!');
      } else if (assignment.candidate_id !== candidateProfile.id) {
        console.log('    ⚠️  BUT candidate_id points to different candidate:', assignment.candidate_id);
      }
    }
  }
  
  // 3. Check if there's a specific assignment with this candidate_id
  if (candidateProfile) {
    const { data: candidateAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('candidate_id', candidateProfile.id);
    
    console.log('\n🔗 ASSIGNMENTS WITH THIS CANDIDATE_ID:');
    if (candidateAssignments && candidateAssignments.length > 0) {
      console.log('  Found', candidateAssignments.length, 'assignments');
      candidateAssignments.forEach(a => {
        console.log('    - Assignment ID:', a.id);
        console.log('    - Booking Status:', a.booking_status);
      });
    } else {
      console.log('  ❌ NO ASSIGNMENTS with candidate_id =', candidateProfile.id);
    }
  }
  
  // 4. Check notifications for this candidate
  if (candidateProfile) {
    const { data: notifications } = await supabase
      .from('candidate_notifications')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .eq('project_id', projectId);
    
    console.log('\n📬 NOTIFICATIONS FOR THIS CANDIDATE:');
    if (notifications && notifications.length > 0) {
      notifications.forEach(n => {
        console.log('  - Notification ID:', n.id);
        console.log('    Resource Assignment ID:', n.resource_assignment_id);
        console.log('    Status:', n.status);
        console.log('    Title:', n.title);
      });
    } else {
      console.log('  No notifications found');
    }
  }
  
  // 5. Analysis summary
  console.log('\n' + '='*60);
  console.log('📝 ANALYSIS SUMMARY:');
  
  if (!candidateProfile) {
    console.log('❌ CRITICAL: Candidate does not exist in candidate_profiles!');
    console.log('   The candidate needs to be created first.');
  } else {
    const matchingAssignment = allAssignments?.find(a => 
      a.profile_id === candidateProfile.profile_id && 
      a.seniority === candidateProfile.seniority &&
      a.booking_status === 'accepted'
    );
    
    if (matchingAssignment) {
      if (!matchingAssignment.candidate_id) {
        console.log('⚠️  PROBLEM: Assignment exists but candidate_id is NULL');
        console.log('   When candidate accepts, the candidate_id should be set!');
        console.log('   This is likely the bug in resource-booking function.');
      } else if (matchingAssignment.candidate_id !== candidateProfile.id) {
        console.log('⚠️  PROBLEM: Assignment has wrong candidate_id');
        console.log('   Expected:', candidateProfile.id);
        console.log('   Actual:', matchingAssignment.candidate_id);
      } else {
        console.log('✅ Assignment correctly linked to candidate');
      }
    } else {
      console.log('❌ No matching accepted assignment found for this candidate profile');
    }
  }
}

analyzeCandidate().catch(console.error);