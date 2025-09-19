import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Correction directe des statuts IA...\n');

// 1. Récupérer tous les profils IA
const { data: iaProfiles, error: iaError } = await supabase
  .from('hr_profiles')
  .select('id, name')
  .eq('is_ai', true);

if (iaError) {
  console.error('❌ Erreur récupération profils IA:', iaError);
  process.exit(1);
}

console.log('🤖 Profils IA trouvés:', iaProfiles?.map(p => p.name).join(', '));

// 2. Pour chaque profil IA, corriger toutes ses assignations
let totalFixed = 0;

for (const profile of iaProfiles || []) {
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('id, booking_status, project_id')
    .eq('profile_id', profile.id)
    .neq('booking_status', 'booké');

  if (assignments && assignments.length > 0) {
    console.log(`\n📋 ${profile.name}: ${assignments.length} assignations à corriger`);

    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'booké' })
      .eq('profile_id', profile.id)
      .neq('booking_status', 'booké');

    if (updateError) {
      console.error(`❌ Erreur mise à jour pour ${profile.name}:`, updateError);
    } else {
      totalFixed += assignments.length;
      console.log(`✅ Corrigé ${assignments.length} assignations pour ${profile.name}`);
    }
  } else {
    console.log(`✅ ${profile.name}: Toutes les assignations sont déjà en 'booké'`);
  }
}

// 3. Vérifier aussi via node_data
console.log('\n🔍 Vérification via node_data...');

const { data: allAssignments } = await supabase
  .from('hr_resource_assignments')
  .select('id, node_data, booking_status, profile_id')
  .neq('booking_status', 'booké');

const iaByNodeData = allAssignments?.filter(a => a.node_data?.is_ai === true) || [];

if (iaByNodeData.length > 0) {
  console.log(`📋 ${iaByNodeData.length} ressources IA détectées via node_data à corriger`);

  for (const assignment of iaByNodeData) {
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'booké' })
      .eq('id', assignment.id);

    if (!updateError) {
      totalFixed++;
      console.log(`✅ Corrigé assignation ${assignment.id}`);
    }
  }
}

console.log(`\n✅ Total corrigé: ${totalFixed} assignations`);

// 4. Vérification finale
console.log('\n📊 Vérification des projets récents...\n');

const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(3);

for (const project of projects || []) {
  console.log(`\n📋 Projet: ${project.name}`);

  const { data: resources } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      booking_status,
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
      const statusIcon = status === 'booké' ? '✅' : status === 'accepted' ? '🟡' : status === 'recherche' ? '🔍' : '⏸️';

      console.log(`  ${icon} ${profile?.name || 'Unknown'}: ${statusIcon} ${status} ${isAI && status !== 'booké' ? '⚠️ PROBLÈME!' : ''}`);
    });
  }
}

console.log('\n✅ Terminé!');
process.exit(0);