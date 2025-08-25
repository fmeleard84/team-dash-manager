import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.5eFR3EUR0RUqxJGH6nyVbTqPl4fmxM1_OcLWHmkTqVU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProjects() {
  console.log('🔍 Checking projects and their resource assignments...\n');
  
  // Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, team_resources')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return;
  }
  
  console.log(`Found ${projects.length} projects:\n`);
  
  for (const project of projects) {
    console.log(`📁 Project: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Team Resources Flag: ${project.team_resources}`);
    
    // Check resource assignments
    const { data: resources, error: resourcesError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority,
        languages,
        expertises,
        booking_status,
        calculated_price,
        node_data,
        hr_profiles (
          name,
          is_ai
        )
      `)
      .eq('project_id', project.id);
    
    if (resourcesError) {
      console.log(`   ❌ Error fetching resources: ${resourcesError.message}`);
    } else if (resources && resources.length > 0) {
      console.log(`   ✅ Found ${resources.length} resource assignments:`);
      resources.forEach((resource, index) => {
        console.log(`      ${index + 1}. ${resource.hr_profiles?.name || 'Unknown'}`);
        console.log(`         - ID: ${resource.id}`);
        console.log(`         - Seniority: ${resource.seniority}`);
        console.log(`         - Languages: ${resource.languages?.join(', ') || 'None'}`);
        console.log(`         - Expertises: ${resource.expertises?.join(', ') || 'None'}`);
        console.log(`         - Booking Status: ${resource.booking_status}`);
        console.log(`         - Price: ${resource.calculated_price}€/mn`);
        console.log(`         - Is AI: ${resource.hr_profiles?.is_ai || false}`);
        console.log(`         - Node Data: ${JSON.stringify(resource.node_data)}`);
      });
    } else {
      console.log(`   ⚠️ No resource assignments found`);
    }
    
    console.log('\n');
  }
  
  // Check for orphaned resources
  console.log('🔍 Checking for orphaned resource assignments...\n');
  const { data: orphaned, error: orphanedError } = await supabase
    .from('hr_resource_assignments')
    .select('id, project_id')
    .is('project_id', null);
  
  if (orphanedError) {
    console.error('Error checking orphaned resources:', orphanedError);
  } else if (orphaned && orphaned.length > 0) {
    console.log(`⚠️ Found ${orphaned.length} orphaned resource assignments`);
  } else {
    console.log('✅ No orphaned resource assignments');
  }
}

checkProjects().catch(console.error);