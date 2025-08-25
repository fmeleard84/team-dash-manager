import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.4BRPKfKdLSi_6VuVVYscYQY7JajN4CJvPaOhNHPKyhM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllData() {
  console.log('🔍 LISTING ALL DATA');
  console.log('=====================================\n');
  
  // 1. List all candidates
  const { data: candidates, error: candError } = await supabase
    .from('candidate_profiles')
    .select('id, email, profile_id, seniority, status')
    .limit(10);
  
  console.log('👥 CANDIDATES:');
  if (candError) {
    console.log('Error:', candError.message);
  } else if (candidates && candidates.length > 0) {
    candidates.forEach(c => {
      console.log(`  - ${c.email} | ID: ${c.id} | Profile: ${c.profile_id} | ${c.seniority} | Status: ${c.status}`);
    });
  } else {
    console.log('  No candidates found or not accessible');
  }
  
  // 2. List all assignments
  console.log('\n📋 ASSIGNMENTS:');
  const { data: assignments, error: assError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      booking_status,
      profile_id,
      seniority,
      candidate_id,
      projects (
        title
      )
    `)
    .limit(10);
  
  if (assError) {
    console.log('Error:', assError.message);
  } else if (assignments && assignments.length > 0) {
    assignments.forEach(a => {
      console.log(`  - ${a.projects?.title || 'No project'} | Status: ${a.booking_status} | Profile: ${a.profile_id} | ${a.seniority} | Candidate: ${a.candidate_id || 'NULL'}`);
    });
  } else {
    console.log('  No assignments found or not accessible');
  }
  
  // 3. List all projects
  console.log('\n📁 PROJECTS:');
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, title, status')
    .limit(10);
  
  if (projError) {
    console.log('Error:', projError.message);
  } else if (projects && projects.length > 0) {
    projects.forEach(p => {
      console.log(`  - ${p.title} | Status: ${p.status}`);
    });
  } else {
    console.log('  No projects found or not accessible');
  }
}

listAllData().catch(console.error);