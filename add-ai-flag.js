import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjYwOTA1NCwiZXhwIjoyMDM4MTg1MDU0fQ.VWpPsF37f8rH9BH8dCEogfGz1JfJNK-UrRWLQOxA9sQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAIFlag() {
  try {
    // First check if column exists by trying to query it
    const { data: testData, error: testError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .limit(1);
    
    if (testError && testError.message.includes('column')) {
      console.log('Column does not exist, need to add it manually via SQL');
      
      // Since we can't alter table directly, we'll need to use a different approach
      // Let's update the type definitions first
      console.log('⚠️ Please run this SQL in your Supabase dashboard:');
      console.log(`
ALTER TABLE public.hr_profiles 
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.hr_profiles.is_ai IS 'Indicates if this profile is an AI resource rather than a human resource';
      `);
      
      return;
    }
    
    // If column exists, update AI profiles
    console.log('✅ Column exists, updating AI profiles...');
    
    const { data: profiles, error: fetchError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai');
    
    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
      return;
    }
    
    console.log('Current profiles:', profiles);
    
    // Update profiles that appear to be AI
    const aiKeywords = ['ai', 'intelligence artificielle', 'gpt', 'claude', 'bot', 'llm', 'machine learning'];
    
    for (const profile of profiles) {
      const isAI = aiKeywords.some(keyword => 
        profile.name.toLowerCase().includes(keyword)
      );
      
      if (isAI && !profile.is_ai) {
        const { error: updateError } = await supabase
          .from('hr_profiles')
          .update({ is_ai: true })
          .eq('id', profile.id);
        
        if (updateError) {
          console.error(`Error updating profile ${profile.name}:`, updateError);
        } else {
          console.log(`✅ Updated ${profile.name} as AI resource`);
        }
      }
    }
    
    // Fetch updated profiles
    const { data: updatedProfiles } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .order('name');
    
    console.log('\n📊 All profiles with AI flag:');
    updatedProfiles?.forEach(p => {
      console.log(`  ${p.is_ai ? '🤖' : '👤'} ${p.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addAIFlag();