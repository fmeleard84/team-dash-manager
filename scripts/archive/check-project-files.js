import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjYwMjYzNSwiZXhwIjoyMDM4MTc4NjM1fQ.FgAz-XqnhBOZqDqIus0BUcJXH-d-4U1THCJl9BoYVZI';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkFiles() {
  // Find Test RT2 project
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, title')
    .eq('title', 'Test RT2')
    .single();
  
  if (project) {
    console.log('Found project:', project);
    
    // Check for files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', project.id);
    
    console.log('Files for project:', files);
    
    if (!files || files.length === 0) {
      console.log('No files found for this project');
      
      // Check all project files
      const { data: allFiles } = await supabase
        .from('project_files')
        .select('project_id, file_name')
        .limit(10);
      
      console.log('Sample of all project files:', allFiles);
    }
  } else {
    console.log('Project Test RT2 not found');
    
    // List all projects
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, title')
      .limit(20);
    
    console.log('All projects:', allProjects);
  }
}

checkFiles();