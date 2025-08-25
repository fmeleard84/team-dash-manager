const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDMxNTUyNCwiZXhwIjoyMDM5ODkxNTI0fQ.SfJd5hNevDbvFLyAWwmM2fPFKoUzqe5nSCKXNq2CJRo'
);

async function debugAssignments() {
  console.log('🔍 DEBUGGING: Direct database query for candidate assignments');
  
  const candidateProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37';
  const seniority = 'intermediate';
  
  console.log('📋 Parameters:', { candidateProfileId, seniority });
  
  try {
    // 1. Check all assignments for this profile_id
    const { data: allAssignments, error: allError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', candidateProfileId);
      
    console.log('🗂️ ALL ASSIGNMENTS for profile_id:', allAssignments?.length || 0);
    if (allError) console.log('❌ Error fetching all assignments:', allError);
    
    // 2. Check assignments with seniority filter
    const { data: seniorityAssignments, error: seniorityError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority);
      
    console.log('🎯 ASSIGNMENTS with seniority filter:', seniorityAssignments?.length || 0);
    if (seniorityError) console.log('❌ Error fetching seniority assignments:', seniorityError);
    
    // 3. Check accepted assignments specifically
    const { data: acceptedAssignments, error: acceptedError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority, 
        booking_status,
        project_id,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('profile_id', candidateProfileId)
      .eq('seniority', seniority)
      .in('booking_status', ['accepted', 'booké']);
      
    console.log('✅ ACCEPTED ASSIGNMENTS:', acceptedAssignments?.length || 0);
    if (acceptedError) console.log('❌ Error fetching accepted assignments:', acceptedError);
    
    // 4. Show details
    if (allAssignments) {
      console.log('\n📊 ALL ASSIGNMENTS DETAILS:');
      allAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Profile ID: ${assignment.profile_id}`);
        console.log(`   Seniority: ${assignment.seniority}`);
        console.log(`   Booking Status: ${assignment.booking_status}`);
        console.log(`   Project ID: ${assignment.project_id}`);
        console.log('---');
      });
    }
    
    if (acceptedAssignments) {
      console.log('\n✅ ACCEPTED ASSIGNMENTS DETAILS:');
      acceptedAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Booking Status: ${assignment.booking_status}`);
        console.log(`   Project: ${assignment.projects?.title} (Status: ${assignment.projects?.status})`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error in debug function:', error);
  }
}

debugAssignments();