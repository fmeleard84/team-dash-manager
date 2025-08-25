const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY3NjU0MiwiZXhwIjoyMDM4MjUyNTQyfQ.AMZrRUQKVDUCFu7pLVKJquW6PsKj68V0iNj5ER1t9AY';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyFixes() {
  try {
    console.log('Applying RLS fixes for candidate profiles...');

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('fix-candidate-profiles-rls', {
      body: {}
    });

    if (error) {
      console.error('Error calling function:', error);
      return;
    }

    console.log('Result:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFixes();