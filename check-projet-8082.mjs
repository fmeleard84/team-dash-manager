import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkProjet8082() {
  console.log('🔍 Analyse du projet "Projet 8082"...\n');

  // 1. Trouver le projet
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%Projet 8082%');

  if (!projects || projects.length === 0) {
    console.log('❌ Projet "Projet 8082" non trouvé');
    return;
  }

  const project = projects[0];
  console.log('✅ Projet trouvé:');
  console.log('   - ID:', project.id);
  console.log('   - Status:', project.status);
  console.log('   - Owner:', project.owner_id);

  // 2. Vérifier les ressources assignées
  console.log('\n📊 Ressources assignées:');

  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        is_ai,
        prompt_id
      )
    `)
    .eq('project_id', project.id);

  if (!assignments || assignments.length === 0) {
    console.log('   ❌ Aucune ressource assignée');
    return;
  }

  console.log(`   Total: ${assignments.length} ressource(s)`);

  assignments.forEach(a => {
    const isIA = a.hr_profiles?.is_ai;
    const icon = isIA ? '🤖' : '👤';
    console.log(`\n   ${icon} ${a.hr_profiles?.name || 'N/A'}`);
    console.log(`      - profile_id: ${a.profile_id}`);
    console.log(`      - candidate_id: ${a.candidate_id || '❌ NULL'}`);
    console.log(`      - booking_status: ${a.booking_status} ${a.booking_status !== 'accepted' ? '⚠️' : '✅'}`);
    console.log(`      - is_ai: ${a.hr_profiles?.is_ai || false}`);
    console.log(`      - prompt_id: ${a.hr_profiles?.prompt_id || 'N/A'}`);

    if (isIA && a.booking_status !== 'accepted') {
      console.log(`      ⚠️  PROBLÈME: booking_status devrait être 'accepted'`);
    }
    if (isIA && !a.candidate_id) {
      console.log(`      ⚠️  PROBLÈME: candidate_id manquant`);
    }
  });

  // 3. Résumé
  console.log('\n' + '='.repeat(50));

  const iaResources = assignments.filter(a => a.hr_profiles?.is_ai);
  const problemsIA = iaResources.filter(a =>
    a.booking_status !== 'accepted' || !a.candidate_id
  );

  if (problemsIA.length > 0) {
    console.log('\n❌ CORRECTIONS NÉCESSAIRES:');
    console.log('Les ressources IA doivent avoir:');
    console.log('   - booking_status = "accepted"');
    console.log('   - candidate_id = profile_id');
    console.log('\n💡 Solution: Re-sauvegarder le projet dans ReactFlow');
  } else if (iaResources.length > 0) {
    console.log('\n✅ Configuration IA correcte!');
  } else {
    console.log('\n⚠️  Aucune ressource IA dans ce projet');
  }
}

checkProjet8082().catch(console.error);