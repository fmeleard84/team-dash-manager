import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function diagnoseIAVisibility() {
  const projectId = '5ec653f5-5de9-4291-a2d9-e301425adbad'; // ID from your logs
  const clientId = '8a1f0522-7c13-4bb9-8bdf-8c6e6f80228a'; // Client ID from logs
  const candidateId = '6cc0150b-30ef-4020-ba1b-ca20ba685310'; // Candidate ID from logs

  console.log('🔍 Diagnostic de visibilité IA\n');
  console.log('=' .repeat(50));

  // 1. Vérifier le projet
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    console.log('❌ Projet non trouvé avec ID:', projectId);
    return;
  }

  console.log('✅ Projet:', project.title);
  console.log('   - Status:', project.status);
  console.log('   - Owner ID:', project.owner_id);

  // 2. Récupérer TOUTES les ressources assignées (sans filtre booking_status)
  console.log('\n📊 TOUTES les ressources du projet:');

  const { data: allAssignments } = await supabase
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
    .eq('project_id', projectId);

  console.log('Total ressources:', allAssignments?.length || 0);

  allAssignments?.forEach(a => {
    const icon = a.hr_profiles?.is_ai ? '🤖' : '👤';
    console.log(`\n${icon} ${a.hr_profiles?.name || 'N/A'}`);
    console.log('   - profile_id:', a.profile_id);
    console.log('   - candidate_id:', a.candidate_id || '❌ NULL');
    console.log('   - booking_status:', a.booking_status, a.booking_status === 'accepted' ? '✅' : '❌');
    console.log('   - is_ai:', a.hr_profiles?.is_ai || false);
  });

  // 3. Simuler la requête côté CLIENT
  console.log('\n' + '=' .repeat(50));
  console.log('\n🧑‍💼 SIMULATION VUE CLIENT:');

  const { data: clientAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        name,
        is_ai,
        prompt_id
      )
    `)
    .eq('project_id', projectId)
    .in('booking_status', ['accepted', 'completed']);

  console.log('Ressources visibles (booking_status accepted/completed):', clientAssignments?.length || 0);

  const iaForClient = clientAssignments?.filter(a => a.hr_profiles?.is_ai);
  console.log('IA visibles:', iaForClient?.length || 0);
  iaForClient?.forEach(ia => {
    console.log('   - 🤖', ia.hr_profiles?.name);
  });

  // 4. Simuler la requête côté CANDIDAT
  console.log('\n' + '=' .repeat(50));
  console.log('\n👷 SIMULATION VUE CANDIDAT:');

  // Les candidats voient exactement la même chose que les clients
  console.log('Ressources visibles (booking_status accepted/completed):', clientAssignments?.length || 0);
  console.log('IA visibles:', iaForClient?.length || 0);

  // 5. Analyser le problème
  console.log('\n' + '=' .repeat(50));
  console.log('\n🔍 ANALYSE DU PROBLÈME:\n');

  const iaResources = allAssignments?.filter(a => a.hr_profiles?.is_ai) || [];

  if (iaResources.length === 0) {
    console.log('❌ AUCUNE ressource IA dans ce projet !');
    console.log('\nSolution: Ajouter une ressource IA dans ReactFlow');
  } else {
    console.log('✅ IA trouvée(s):', iaResources.length);

    const iaWithWrongStatus = iaResources.filter(a => a.booking_status !== 'accepted');

    if (iaWithWrongStatus.length > 0) {
      console.log('\n❌ PROBLÈME: IA avec mauvais booking_status');
      iaWithWrongStatus.forEach(ia => {
        console.log(`   - ${ia.hr_profiles?.name}: booking_status = "${ia.booking_status}"`);
      });
      console.log('\n💡 SOLUTION:');
      console.log('1. Ouvrir le projet dans ReactFlow');
      console.log('2. Re-sauvegarder pour corriger le booking_status');
    } else {
      console.log('✅ Toutes les IA ont booking_status = "accepted"');
      console.log('\n⚠️  Si l\'IA n\'apparaît toujours pas côté candidat:');
      console.log('- Vérifier les politiques RLS sur hr_resource_assignments');
      console.log('- Vérifier que le candidat est bien dans le projet');
    }
  }

  // 6. Vérifier si le candidat est bien dans le projet
  console.log('\n' + '=' .repeat(50));
  console.log('\n👤 VÉRIFICATION DU CANDIDAT:');

  const candidateAssignment = allAssignments?.find(a =>
    a.candidate_id === candidateId && !a.hr_profiles?.is_ai
  );

  if (candidateAssignment) {
    console.log('✅ Le candidat est bien dans le projet');
    console.log('   - Métier:', candidateAssignment.hr_profiles?.name);
    console.log('   - Status:', candidateAssignment.booking_status);
  } else {
    console.log('❌ Le candidat n\'est pas dans ce projet !');
  }
}

diagnoseIAVisibility().catch(console.error);