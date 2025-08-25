import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

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
    
    // Check files for each test project
    for (const proj of testProjects) {
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', proj.id);
      
      console.log('\nFiles for', proj.title + ':', files?.length || 0);
      files?.forEach(f => console.log(' -', f.file_name, '(uploaded:', f.uploaded_at, ')'));
    }
  }
  
  // Check total files
  const { count } = await supabase
    .from('project_files')
    .select('*', { count: 'exact', head: true });
  
  console.log('\nTotal files in database:', count);
}

check();