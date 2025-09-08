import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAssignmentStructure() {
  console.log('\n🔍 Checking hr_resource_assignments structure\n');
  
  // Try to get any assignment to see the structure
  const { data: sample, error } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Error fetching sample:', error);
  } else {
    console.log('📊 Sample assignment structure:');
    console.log('Available columns:', Object.keys(sample || {}));
    console.log('\nFull sample:', JSON.stringify(sample, null, 2));
  }
  
  // Check if rate columns exist
  const columnsToCheck = ['daily_rate', 'hourly_rate', 'rate_per_minute'];
  console.log('\n🔍 Checking for rate columns:');
  
  for (const col of columnsToCheck) {
    const { data, error: colError } = await supabase
      .from('hr_resource_assignments')
      .select(col)
      .limit(1);
    
    if (colError) {
      console.log(`  ❌ ${col}: NOT FOUND (${colError.message})`);
    } else {
      console.log(`  ✅ ${col}: EXISTS`);
    }
  }
  
  // Try the exact query that's failing
  console.log('\n🔍 Testing exact failing query:');
  const { data: testQuery, error: testError } = await supabase
    .from('hr_resource_assignments')
    .select('daily_rate, hourly_rate, rate_per_minute')
    .limit(1);
  
  if (testError) {
    console.error('❌ Query failed:', testError);
  } else {
    console.log('✅ Query succeeded, data:', testQuery);
  }
}

checkAssignmentStructure().catch(console.error);