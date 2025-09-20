import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Fixing IA resources candidate_id...\n');

// 1. Get all IA profiles
const { data: iaProfiles, error: iaError } = await supabase
  .from('hr_profiles')
  .select('id, name, is_ai')
  .eq('is_ai', true);

if (iaError) {
  console.error('❌ Error fetching IA profiles:', iaError);
  process.exit(1);
}

console.log(`Found ${iaProfiles?.length || 0} IA profiles:`, iaProfiles?.map(p => p.name).join(', '));

// 2. Fix all assignments for IA resources
let totalFixed = 0;

for (const profile of iaProfiles || []) {
  // Get all assignments for this IA profile
  const { data: assignments, error: fetchError } = await supabase
    .from('hr_resource_assignments')
    .select('id, booking_status, candidate_id, project_id')
    .eq('profile_id', profile.id);

  if (fetchError) {
    console.error(`Error fetching assignments for ${profile.name}:`, fetchError);
    continue;
  }

  const toUpdate = assignments?.filter(a =>
    a.booking_status !== 'accepted' || a.candidate_id !== profile.id
  ) || [];

  if (toUpdate.length > 0) {
    console.log(`\n📋 ${profile.name}: ${toUpdate.length} assignments to fix`);

    // Update to set booking_status = 'accepted' AND candidate_id = profile_id
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        booking_status: 'accepted',
        candidate_id: profile.id // IA uses profile_id as candidate_id
      })
      .eq('profile_id', profile.id);

    if (updateError) {
      console.error(`❌ Error updating ${profile.name}:`, updateError);
    } else {
      totalFixed += toUpdate.length;
      console.log(`✅ Fixed ${toUpdate.length} assignments for ${profile.name}`);
    }
  } else {
    console.log(`✅ ${profile.name}: All assignments already correct`);
  }
}

// 3. Also fix assignments identified as IA via node_data
console.log('\n🔍 Checking for IA resources via node_data...');

const { data: allAssignments } = await supabase
  .from('hr_resource_assignments')
  .select('id, node_data, booking_status, candidate_id, profile_id')
  .not('node_data', 'is', null);

const iaByNodeData = allAssignments?.filter(a =>
  a.node_data?.is_ai === true &&
  (a.booking_status !== 'accepted' || a.candidate_id !== a.profile_id)
) || [];

if (iaByNodeData.length > 0) {
  console.log(`📋 ${iaByNodeData.length} IA resources detected via node_data to fix`);

  for (const assignment of iaByNodeData) {
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        booking_status: 'accepted',
        candidate_id: assignment.profile_id // Use profile_id as candidate_id for IA
      })
      .eq('id', assignment.id);

    if (!updateError) {
      totalFixed++;
      console.log(`✅ Fixed IA assignment ${assignment.id}`);
    }
  }
}

console.log(`\n✅ Total fixed: ${totalFixed} assignments`);

// 4. Verify the fix
console.log('\n📊 Verifying fix...\n');

const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(3);

for (const project of projects || []) {
  console.log(`\n📋 Project: ${project.name}`);

  const { data: resources } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      booking_status,
      candidate_id,
      profile_id,
      node_data,
      hr_profiles!profile_id (
        name,
        is_ai
      )
    `)
    .eq('project_id', project.id);

  if (resources) {
    resources.forEach(r => {
      const profile = r.hr_profiles;
      const isAI = profile?.is_ai || r.node_data?.is_ai;
      const icon = isAI ? '🤖' : '👤';
      const status = r.booking_status;
      const hasCandidateId = r.candidate_id ? '✓' : '✗';

      console.log(`  ${icon} ${profile?.name || 'Unknown'}: ${status} | candidate_id: ${hasCandidateId} ${
        isAI && r.candidate_id !== r.profile_id ? '⚠️ MISMATCH!' : ''
      }`);
    });
  }
}

console.log('\n✅ Fix completed!');
process.exit(0);