import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzODkxNzcsImV4cCI6MjAzNjk2NTE3N30.Bvw9BhzhMZ5c5ho-PBtGfS-9JJCmFwcplW9m7O-1yNQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  try {
    // Try to select from task_ratings
    const { data, error } = await supabase
      .from('task_ratings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Table task_ratings does not exist:', error.message);
      console.log('Need to create it manually in Supabase dashboard');
    } else {
      console.log('✅ Table task_ratings exists!');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkTable();