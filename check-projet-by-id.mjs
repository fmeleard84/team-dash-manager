import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkProjectById() {
  const projectId = '5ec653f5-5de9-4291-a2d9-e301425adbad'; // ID from logs

  console.log('🔍 Analyse du projet ID:', projectId, '\n');

  // 1. Trouver le projet
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    console.log('❌ Projet non trouvé');
    return;
  }

  console.log('✅ Projet trouvé:', project.title);
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

  let hasIA = false;
  let iaProblems = [];

  assignments.forEach(a => {
    const isIA = a.hr_profiles?.is_ai;
    const icon = isIA ? '🤖' : '👤';
    console.log(`\n   ${icon} ${a.hr_profiles?.name || 'N/A'}`);
    console.log(`      - profile_id: ${a.profile_id}`);
    console.log(`      - candidate_id: ${a.candidate_id || '❌ NULL'}`);
    console.log(`      - booking_status: ${a.booking_status} ${a.booking_status !== 'accepted' ? '⚠️' : '✅'}`);
    console.log(`      - is_ai: ${a.hr_profiles?.is_ai || false}`);

    if (isIA) {
      hasIA = true;
      console.log(`      - prompt_id: ${a.hr_profiles?.prompt_id || '❌ MANQUANT'}`);

      if (a.booking_status !== 'accepted') {
        iaProblems.push(`booking_status est "${a.booking_status}" au lieu de "accepted"`);
      }
      if (!a.candidate_id) {
        iaProblems.push('candidate_id est NULL');
      } else if (a.candidate_id !== a.profile_id) {
        iaProblems.push(`candidate_id (${a.candidate_id}) != profile_id (${a.profile_id})`);
      }
      if (!a.hr_profiles?.prompt_id) {
        iaProblems.push('prompt_id non configuré');
      }
    }
  });

  // 3. Vérifier les threads
  console.log('\n💬 Threads de messagerie:');
  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, title')
    .eq('project_id', project.id);

  if (threads && threads.length > 0) {
    threads.forEach(t => {
      console.log(`   - ${t.title} (${t.id})`);
    });
  } else {
    console.log('   ❌ Aucun thread');
  }

  // 4. Résumé
  console.log('\n' + '='.repeat(50));

  if (!hasIA) {
    console.log('\n⚠️  AUCUNE RESSOURCE IA dans ce projet');
    console.log('Ajoutez une ressource IA dans ReactFlow');
  } else if (iaProblems.length > 0) {
    console.log('\n❌ PROBLÈMES DÉTECTÉS AVEC L\'IA:');
    iaProblems.forEach(p => console.log(`   - ${p}`));
    console.log('\n💡 SOLUTION:');
    console.log('1. Ouvrir le projet dans ReactFlow: /project/' + project.id);
    console.log('2. Cliquer sur "Sauvegarder" pour corriger automatiquement');
  } else {
    console.log('\n✅ Configuration IA correcte!');
    console.log('\nPOUR TESTER:');
    console.log('1. Dans la messagerie, sélectionnez l\'IA dans la liste des membres');
    console.log('2. Envoyez un message comme "Créer un article sur..."');
    console.log('3. L\'IA devrait répondre');
  }
}

checkProjectById().catch(console.error);