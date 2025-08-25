import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjYwMjYzNSwiZXhwIjoyMDM4MTc4NjM1fQ.FgAz-XqnhBOZqDqIus0BUcJXH-d-4U1THCJl9BoYVZI';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAll() {
  // Check projects count
  const { count: projectCount, error: projCountError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total projects:', projectCount, projCountError ? projCountError.message : '');
  
  // Get some projects
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, title')
    .limit(5);
  
  console.log('Sample projects:', projects, projError ? projError.message : '');
  
  // Check project_files count
  const { count: filesCount, error: filesCountError } = await supabase
    .from('project_files')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total project files:', filesCount, filesCountError ? filesCountError.message : '');
  
  // Get some files
  const { data: files, error: filesError } = await supabase
    .from('project_files')
    .select('id, project_id, file_name')
    .limit(5);
  
  console.log('Sample files:', files, filesError ? filesError.message : '');
}

checkAll();