import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkProjectsAndAssignments() {
  console.log('\n🔍 Checking projects and assignments\n');
  
  // 1. Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    return;
  }
  
  console.log('📊 Total projects found:', projects?.length || 0);
  
  if (!projects || projects.length === 0) {
    console.log('No projects found');
    return;
  }
  
  // Take first project for testing
  const project = projects[0];
  console.log('\n📋 First project:', {
    id: project.id,
    title: project.title,
    owner_id: project.owner_id,
    status: project.status
  });
  
  // 2. Get owner profile
  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', project.owner_id)
    .single();
  
  console.log('\n👤 Owner profile:', {
    id: owner?.id,
    email: owner?.email,
    first_name: owner?.first_name,
    user_id: owner?.user_id
  });
  
  // 3. Get assignments for this project - SIMPLIFIED QUERY
  console.log('\n🔍 Fetching assignments for project:', project.id);
  
  const { data: assignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', project.id);
  
  if (assignError) {
    console.error('❌ Error fetching assignments:', assignError);
  } else {
    console.log('✅ Assignments found:', assignments?.length || 0);
    
    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        console.log('\n📝 Assignment:', {
          id: assignment.id,
          candidate_id: assignment.candidate_id,
          profile_id: assignment.profile_id,
          seniority: assignment.seniority,
          booking_status: assignment.booking_status
        });
        
        // Get hr_profile separately
        if (assignment.profile_id) {
          const { data: hrProfile } = await supabase
            .from('hr_profiles')
            .select('id, name, label')
            .eq('id', assignment.profile_id)
            .single();
          
          console.log('  📚 HR Profile:', hrProfile);
        }
        
        // Get candidate if assigned
        if (assignment.candidate_id) {
          const { data: candidateProfile } = await supabase
            .from('profiles')
            .select('id, email, first_name, user_id')
            .eq('id', assignment.candidate_id)
            .single();
          
          console.log('  👤 Candidate (profiles):', candidateProfile);
          
          const { data: candidateData } = await supabase
            .from('candidate_profiles')
            .select('id, email, first_name, position')
            .eq('id', assignment.candidate_id)
            .single();
          
          console.log('  👤 Candidate (candidate_profiles):', candidateData);
        }
      }
    }
  }
  
  // 4. Test the join query that's failing
  console.log('\n🔍 Testing join query (as in hook):');
  const { data: joinTest, error: joinError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        label
      )
    `)
    .eq('project_id', project.id)
    .in('booking_status', ['accepted', 'completed']);
  
  if (joinError) {
    console.error('❌ Join query error:', joinError);
  } else {
    console.log('✅ Join query success, results:', joinTest?.length || 0);
    if (joinTest && joinTest.length > 0) {
      console.log('First result with join:', JSON.stringify(joinTest[0], null, 2));
    }
  }
}

checkProjectsAndAssignments().catch(console.error);