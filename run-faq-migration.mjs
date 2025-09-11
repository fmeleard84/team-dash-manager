import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  console.log('Running FAQ items migration...');
  
  try {
    // S'authentifier en tant qu'utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.functions.invoke('migrate-to-faq-items');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Migration successful:', data);
    
    // Essayer aussi de corriger les permissions
    console.log('Fixing permissions...');
    const { data: permData, error: permError } = await supabase.functions.invoke('fix-admin-permissions');
    
    if (permError) {
      console.error('Permission fix error:', permError);
    } else {
      console.log('Permissions fixed:', permData);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

runMigration();