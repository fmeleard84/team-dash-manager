import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkNewProjectIA() {
  console.log('🔍 Vérification du projet "New project IA"...\n');

  // 1. Chercher le projet
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%new%project%ia%');

  if (!projects || projects.length === 0) {
    console.log('❌ Projet "New project IA" non trouvé');
    return;
  }

  const project = projects[0];
  console.log('✅ Projet trouvé:', project.title);
  console.log('   - ID:', project.id);
  console.log('   - Status:', project.status);
  console.log('   - Created:', new Date(project.created_at).toLocaleString());

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
    console.log('\n💡 Solution: Ouvrir le projet dans ReactFlow et assigner des ressources');
    return;
  }

  console.log(`   Total: ${assignments.length} ressource(s)`);

  assignments.forEach(a => {
    const isIA = a.hr_profiles?.is_ai;
    const icon = isIA ? '🤖' : '👤';
    console.log(`\n   ${icon} ${a.hr_profiles?.name || 'N/A'}`);
    console.log(`      - profile_id: ${a.profile_id}`);
    console.log(`      - candidate_id: ${a.candidate_id || '❌ NULL'}`);
    console.log(`      - booking_status: ${a.booking_status}`);
    console.log(`      - is_ai: ${a.hr_profiles?.is_ai || false}`);
    console.log(`      - prompt_id: ${a.hr_profiles?.prompt_id || 'N/A'}`);

    if (isIA) {
      if (a.booking_status !== 'accepted') {
        console.log(`      ⚠️  Status devrait être 'accepted' pour une IA`);
      }
      if (!a.candidate_id) {
        console.log(`      ⚠️  candidate_id manquant (devrait être égal à profile_id)`);
      } else if (a.candidate_id !== a.profile_id) {
        console.log(`      ⚠️  candidate_id (${a.candidate_id}) différent de profile_id (${a.profile_id})`);
      }
    }
  });

  // 3. Résumé des corrections nécessaires
  const iaResources = assignments.filter(a => a.hr_profiles?.is_ai);
  const hasProblems = iaResources.some(a =>
    a.booking_status !== 'accepted' ||
    !a.candidate_id ||
    a.candidate_id !== a.profile_id
  );

  console.log('\n' + '=' .repeat(50));

  if (hasProblems) {
    console.log('\n❌ CORRECTIONS NÉCESSAIRES:');
    console.log('1. Ouvrir le projet dans ReactFlow (/project/' + project.id + ')');
    console.log('2. Cliquer sur "Sauvegarder" pour appliquer les corrections');
    console.log('3. Les ressources IA auront alors:');
    console.log('   - booking_status = "accepted"');
    console.log('   - candidate_id = profile_id');
  } else if (iaResources.length > 0) {
    console.log('\n✅ CONFIGURATION CORRECTE !');
    console.log('Les ressources IA sont prêtes pour la messagerie.');
  } else {
    console.log('\n⚠️  Aucune ressource IA dans ce projet');
  }
}

checkNewProjectIA().catch(console.error);