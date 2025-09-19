import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingIssue() {
  console.log('🔍 Checking hr_resource_assignments table issue (Error 400)...\n');

  // Test projects from error logs
  const testProjectIds = [
    'ce32c98f-602e-4eb1-9726-6fbe9546ad3f',
    '43fccfa0-1bda-4bf5-9591-5ff0024312c3',
    'e1cd64db-b076-421c-bd69-fbd486e6dc2f',
    '9a4960fd-27cc-4c82-b857-da18e9473aaa',
    '60e290bc-cd5f-4b20-bf12-925330dba3d8'
  ];

  const projectId = testProjectIds[0];
  console.log(`📋 Testing with project ID: ${projectId}\n`);

  // Test 1: Exact query from ProjectCard.tsx
  console.log('1️⃣ Testing EXACT query from ProjectCard.tsx (with industries):');
  const { data: exact, error: exactError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      profile_id,
      booking_status,
      seniority,
      languages,
      expertises,
      industries,
      candidate_id,
      node_data,
      candidate_profiles (
        first_name,
        last_name,
        daily_rate
      )
    `)
    .eq('project_id', projectId);

  if (exactError) {
    console.error('❌ ERROR 400 reproduced!');
    console.error('   Message:', exactError.message);
    console.error('   Hint:', exactError.hint);
    console.error('   Details:', exactError.details);
    console.error('   Code:', exactError.code);
  } else {
    console.log('✅ Query successful! Found', exact?.length || 0, 'records');
  }

  // Test 2: Query WITHOUT industries column
  console.log('\n2️⃣ Testing query WITHOUT industries column:');
  const { data: noIndustries, error: noIndustriesError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      profile_id,
      booking_status,
      seniority,
      languages,
      expertises,
      candidate_id,
      node_data,
      candidate_profiles (
        first_name,
        last_name,
        daily_rate
      )
    `)
    .eq('project_id', projectId);

  if (noIndustriesError) {
    console.error('❌ Still error without industries:', noIndustriesError.message);
  } else {
    console.log('✅ Query works without industries! Found', noIndustries?.length || 0, 'records');
    if (noIndustries && noIndustries.length > 0) {
      console.log('   Sample data:', noIndustries[0]);
    }
  }

  // Test 3: Simple query without join
  console.log('\n3️⃣ Testing simple query (no join):');
  const { data: simple, error: simpleError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', projectId);

  if (simpleError) {
    console.error('❌ Error even with simple query:', simpleError.message);
  } else {
    console.log('✅ Simple query works! Found', simple?.length || 0, 'records');
    if (simple && simple.length > 0) {
      console.log('   Available columns:', Object.keys(simple[0]));
    }
  }

  // Test 4: Check if table exists and get column info
  console.log('\n4️⃣ Checking table structure:');
  const { data: tableCheck, error: tableError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Cannot access table:', tableError.message);
  } else {
    console.log('✅ Table exists!');
    if (tableCheck && tableCheck.length > 0) {
      const columns = Object.keys(tableCheck[0]);
      console.log('   Available columns:', columns.join(', '));
      console.log('   ⚠️ industries column exists?', columns.includes('industries') ? 'YES' : 'NO');
    }
  }

  console.log('\n📊 DIAGNOSIS:');
  console.log('The error 400 is likely caused by:');
  console.log('1. The "industries" column might not exist in hr_resource_assignments table');
  console.log('2. Or there might be a RLS policy issue with the join to candidate_profiles');
  console.log('\n💡 SOLUTION: Remove "industries" from the select query in ProjectCard.tsx');
}

checkBookingIssue().catch(console.error);