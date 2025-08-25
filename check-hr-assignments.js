import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzODkxNzcsImV4cCI6MjAzNjk2NTE3N30.Bvw9BhzhMZ5c5ho-PBtGfS-9JJCmFwcplW9m7O-1yNQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  try {
    // Get all columns from hr_resource_assignments
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log('✅ Table structure:', data);
      console.log('Columns:', data && data[0] ? Object.keys(data[0]) : 'No data');
    }
    
    // Get assignments for a specific project
    const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId);
    
    if (assignError) {
      console.log('❌ Error fetching assignments:', assignError);
    } else {
      console.log('✅ Assignments for project:', assignments);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkTable();