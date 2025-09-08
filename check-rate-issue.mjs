import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRateIssue() {
  console.log('\n🔍 Checking rate configuration issue\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da'; // From your logs
  
  // 1. Check candidate profile
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('id, profile_id, first_name, position')
    .eq('id', candidateId)
    .single();
  
  console.log('👤 Candidate:', candidateProfile);
  
  if (!candidateProfile) {
    console.log('❌ Candidate not found');
    return;
  }
  
  // 2. Check HR profile and its rate
  const { data: hrProfile } = await supabase
    .from('hr_profiles')
    .select('id, name, base_rate_per_minute')
    .eq('id', candidateProfile.profile_id)
    .single();
  
  console.log('\n📊 HR Profile:', hrProfile);
  
  // 3. Check assignments with rates
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      candidate_id,
      booking_status,
      daily_rate,
      hourly_rate,
      rate_per_minute,
      projects (
        id,
        title,
        status
      )
    `)
    .eq('candidate_id', candidateId)
    .eq('booking_status', 'accepted');
  
  console.log('\n📋 Assignments with rates:');
  if (assignments) {
    assignments.forEach(a => {
      console.log(`\n  Project: ${a.projects?.title}`);
      console.log(`  - Daily rate: ${a.daily_rate || 'NOT SET'}`);
      console.log(`  - Hourly rate: ${a.hourly_rate || 'NOT SET'}`);
      console.log(`  - Rate per minute: ${a.rate_per_minute || 'NOT SET'}`);
    });
  }
  
  // 4. Check rate modifiers
  const { data: modifiers } = await supabase
    .from('rate_modifiers')
    .select('*')
    .eq('is_active', true);
  
  console.log('\n🔧 Active rate modifiers:', modifiers?.length || 0);
  
  // 5. Check stored calculated rate
  const { data: calculatedRate } = await supabase
    .from('candidate_hourly_rates')
    .select('*')
    .eq('candidate_id', candidateId)
    .single();
  
  console.log('\n💰 Stored calculated rate:', calculatedRate);
  
  // Calculate what the rate should be
  if (hrProfile?.base_rate_per_minute) {
    console.log('\n📐 Rate calculation:');
    console.log('  Base rate from HR profile:', hrProfile.base_rate_per_minute, '€/min');
    
    if (modifiers && modifiers.length > 0) {
      let totalIncrease = 0;
      modifiers.forEach(m => {
        if (m.percentage_increase) {
          totalIncrease += m.percentage_increase;
        }
      });
      
      const finalRate = hrProfile.base_rate_per_minute * (1 + totalIncrease / 100);
      console.log('  Total modifier increase:', totalIncrease, '%');
      console.log('  Final calculated rate:', finalRate.toFixed(2), '€/min');
    }
  }
}

checkRateIssue().catch(console.error);