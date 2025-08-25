import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjM0NDg1NywiZXhwIjoyMDM3OTIwODU3fQ.CjJz_Y-qFk7FBN7hv0sUg0MOkccNYKlxMpKNXdPUbVk';

async function fixTrigger() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('Fixing update_updated_at_column function...');

  // Fix the function
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Fix the update_updated_at_column function to not update last_seen
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
  });

  if (error) {
    console.error('Error fixing function:', error);
    return;
  }

  console.log('Function fixed successfully!');
  
  // Test by updating a candidate profile
  console.log('Testing update on candidate_profiles...');
  
  const { data: testData, error: testError } = await supabase
    .from('candidate_profiles')
    .select('id')
    .limit(1)
    .single();
    
  if (testData) {
    const { error: updateError } = await supabase
      .from('candidate_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testData.id);
      
    if (updateError) {
      console.error('Test update failed:', updateError);
    } else {
      console.log('Test update successful!');
    }
  }
}

fixTrigger().catch(console.error);