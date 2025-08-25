import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjM0NDg1NywiZXhwIjoyMDM3OTIwODU3fQ.CjJz_Y-qFk7FBN7hv0sUg0MOkccNYKlxMpKNXdPUbVk';

async function fixTriggerDirectly() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('Fixing update_updated_at_column function directly...');

  try {
    // Use exec_sql RPC function to fix the trigger
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the existing function and all its triggers
        DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
        
        -- Recreate the function to ONLY update updated_at
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Recreate triggers for tables that need it
        CREATE TRIGGER update_candidate_profiles_updated_at
            BEFORE UPDATE ON public.candidate_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
            
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
            
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON public.projects
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
            
        CREATE TRIGGER update_hr_profiles_updated_at
            BEFORE UPDATE ON public.hr_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
      `
    });

    if (error) {
      console.error('❌ Error fixing trigger:', error);
      return;
    }

    console.log('✅ Trigger function fixed successfully!');
    
    // Test the fix
    console.log('\nTesting the fix...');
    
    // Get a candidate profile to test
    const { data: profiles, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .limit(1);
      
    if (fetchError) {
      console.error('Error fetching test profile:', fetchError);
    } else if (profiles && profiles.length > 0) {
      const testProfile = profiles[0];
      console.log('Testing update on profile:', testProfile.id);
      
      // Try to update it with a simple change (just touch updated_at)
      const { data: updatedProfile, error: updateError } = await supabase
        .from('candidate_profiles')
        .update({ 
          last_name: testProfile.last_name || 'Test'
        })
        .eq('id', testProfile.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Update test failed:', updateError);
      } else {
        console.log('✅ Update test successful!');
        console.log('Updated profile:', updatedProfile);
        console.log('\n🎉 The trigger has been fixed! Candidate onboarding should now work correctly.');
      }
    } else {
      console.log('No candidate profiles found to test with.');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixTriggerDirectly().catch(console.error);