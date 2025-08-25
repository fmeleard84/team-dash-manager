import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIzNDQ4NTcsImV4cCI6MjAzNzkyMDg1N30.LT_ktw4P0bJrvacVzRcH0VIHzR7u4Q3vTnJYC6jlFr4';

async function callFixTrigger() {
  console.log('Calling fix-trigger-direct function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-trigger-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (result.success) {
      console.log('✅ Trigger fixed successfully!');
      
      // Test the fix by trying to update a candidate profile
      console.log('\nTesting the fix...');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Get a candidate profile to test
      const { data: profiles, error: fetchError } = await supabase
        .from('candidate_profiles')
        .select('id, first_name')
        .limit(1);
        
      if (fetchError) {
        console.error('Error fetching test profile:', fetchError);
      } else if (profiles && profiles.length > 0) {
        const testProfile = profiles[0];
        console.log('Testing update on profile:', testProfile.id);
        
        // Try to update it
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({ first_name: testProfile.first_name })
          .eq('id', testProfile.id);
          
        if (updateError) {
          console.error('❌ Update test failed:', updateError);
        } else {
          console.log('✅ Update test successful! Trigger is working correctly.');
        }
      }
    } else {
      console.error('❌ Failed to fix trigger:', result.error);
    }
  } catch (error) {
    console.error('Error calling function:', error);
  }
}

callFixTrigger().catch(console.error);