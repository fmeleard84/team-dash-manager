import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI2MzUsImV4cCI6MjAzODE3ODYzNX0.cyMSSso0Hd8ERwJTSBdD1xk2CZrj1k6JQsZ2lQQZE1c';

const supabase = createClient(supabaseUrl, anonKey);

async function check() {
  // List projects
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (projError) {
    console.log('Error getting projects:', projError.message);
  } else {
    console.log('Recent projects:', projects?.length || 0);
    projects?.forEach(p => console.log(' -', p.title, '(ID:', p.id, ')'));
  }
  
  // Check for project with "Test" in title
  const { data: testProjects, error: testError } = await supabase
    .from('projects')
    .select('id, title')
    .ilike('title', '%test%');
  
  if (!testError && testProjects) {
    console.log('\nProjects with "Test" in title:', testProjects.length);
    testProjects.forEach(p => console.log(' -', p.title, '(ID:', p.id, ')'));
    
    // Check files for first test project
    if (testProjects.length > 0) {
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', testProjects[0].id);
      
      console.log('\nFiles for', testProjects[0].title + ':', files?.length || 0);
      files?.forEach(f => console.log(' -', f.file_name));
    }
  }
}

check();