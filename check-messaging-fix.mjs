import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMessagingIssue() {
  console.log('\n🔍 Debugging messaging members issue\n');
  
  // First authenticate as a client
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'clienttest@example.com',
    password: 'clientpass123'
  });
  
  if (authError) {
    console.log('Auth error, trying another user...');
    // Try another user
    const { data: auth2, error: auth2Error } = await supabase.auth.signInWithPassword({
      email: 'client1@example.com',
      password: 'password123'
    });
    
    if (auth2Error) {
      console.error('❌ Could not authenticate:', auth2Error);
      return;
    }
  }
  
  const user = authData?.user || auth2?.user;
  console.log('✅ Authenticated as:', user?.email, 'ID:', user?.id);
  
  // Get projects for this user
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user?.id)
    .order('created_at', { ascending: false });
  
  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    // Try without filter
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, title, owner_id, status')
      .limit(5);
    
    console.log('All projects (first 5):', allProjects);
    return;
  }
  
  console.log('📊 Projects found for user:', projects?.length || 0);
  
  if (!projects || projects.length === 0) {
    // Get any project for testing
    const { data: anyProject } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
      .single();
    
    if (anyProject) {
      console.log('Using any project for testing:', anyProject.id, anyProject.title);
      projects = [anyProject];
    } else {
      console.log('No projects found at all');
      return;
    }
  }
  
  const project = projects[0];
  console.log('\n📋 Testing with project:', {
    id: project.id,
    title: project.title,
    status: project.status
  });
  
  // Test the exact query from the hook
  console.log('\n🔍 Testing exact query from hook:');
  const { data: assignments, error: assignError } = await supabase
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
  
  if (assignError) {
    console.error('❌ Assignments query error:', assignError);
    console.error('Full error:', JSON.stringify(assignError, null, 2));
  } else {
    console.log('✅ Assignments found:', assignments?.length || 0);
    if (assignments && assignments.length > 0) {
      console.log('\nFirst assignment:', JSON.stringify(assignments[0], null, 2));
    }
  }
  
  // Test without join
  console.log('\n🔍 Testing without join:');
  const { data: simpleAssignments, error: simpleError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', project.id);
  
  if (simpleError) {
    console.error('❌ Simple query error:', simpleError);
  } else {
    console.log('✅ Simple assignments found:', simpleAssignments?.length || 0);
    if (simpleAssignments && simpleAssignments.length > 0) {
      console.log('Booking statuses:', simpleAssignments.map(a => a.booking_status));
    }
  }
}

checkMessagingIssue().catch(console.error);