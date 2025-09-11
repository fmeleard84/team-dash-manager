import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  console.log('Applying FAQ sync migration...');
  
  try {
    const { data, error } = await supabase.functions.invoke('apply-faq-sync-migration');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Migration successful:', data);
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

runMigration();