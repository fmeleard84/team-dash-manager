import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugMessagingMembers() {
  console.log('\n🔍 DEBUG: Analysing messaging members issue\n');
  
  // First check if we have any projects at all
  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, owner_id, status')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    return;
  }
  
  console.log('📊 Total projects found:', allProjects?.length || 0);
  if (allProjects && allProjects.length > 0) {
    console.log('Project statuses:', allProjects.map(p => p.status));
  }
  
  if (!allProjects || allProjects.length === 0) {
    console.log('❌ No projects found at all');
    return;
  }
  
  const projects = allProjects;
  
  const project = projects[0];
  console.log('📋 Testing with project:', {
    id: project.id,
    title: project.title,
    owner_id: project.owner_id,
    status: project.status
  });
  
  // 2. Get owner/client info
  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', project.owner_id)
    .single();
  
  console.log('\n👤 Owner/Client:', {
    id: owner?.id,
    email: owner?.email,
    first_name: owner?.first_name,
    user_id: owner?.user_id
  });
  
  // 3. Get assignments for this project
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
    console.error('❌ Error fetching assignments:', assignError);
    return;
  }
  
  console.log('\n📊 Assignments found:', assignments?.length || 0);
  
  if (assignments && assignments.length > 0) {
    for (const assignment of assignments) {
      console.log('\n📝 Assignment:', {
        id: assignment.id,
        candidate_id: assignment.candidate_id,
        profile_id: assignment.profile_id,
        booking_status: assignment.booking_status,
        seniority: assignment.seniority,
        hr_profile: assignment.hr_profiles
      });
      
      // Try to get candidate info
      if (assignment.candidate_id) {
        // Check candidate_profiles
        const { data: candidate } = await supabase
          .from('candidate_profiles')
          .select('id, email, first_name, last_name, position')
          .eq('id', assignment.candidate_id)
          .single();
        
        console.log('  👤 Candidate profile:', candidate ? {
          id: candidate.id,
          email: candidate.email,
          name: `${candidate.first_name} ${candidate.last_name}`,
          position: candidate.position
        } : 'NOT FOUND');
        
        // Check profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, first_name, user_id')
          .eq('id', assignment.candidate_id)
          .single();
        
        console.log('  👤 User profile:', profile ? {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          user_id: profile.user_id
        } : 'NOT FOUND');
      }
    }
  }
  
  // 4. Check what the owner ID looks like in the unified system
  console.log('\n🔍 Checking ID unification impact:');
  console.log('Owner ID (from project):', project.owner_id);
  console.log('Owner user_id (from profile):', owner?.user_id);
  console.log('Are they the same?:', project.owner_id === owner?.user_id);
  
  // 5. Check if client has a client_profiles entry
  const { data: clientProfile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', project.owner_id)
    .single();
  
  console.log('\n👤 Client profile exists?:', clientProfile ? 'YES' : 'NO');
  if (clientProfile) {
    console.log('Client profile ID:', clientProfile.id);
  }
}

debugMessagingMembers().catch(console.error);