import { createClient } from '@supabase/supabase-js';

// Utiliser les valeurs directement depuis le projet
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTM4NzQsImV4cCI6MjAzODE2OTg3NH0.V46sINZHShqwFD5fP0xEA2ZDBE4qziqVQJJzubQD0ZE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeAcceptanceSystem() {
  const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
  
  console.log('=== ANALYSE DU SYSTÈME D\'ACCEPTATION DE PROJET ===\n');
  console.log('Projet: Comptable junior client_2');
  console.log('ID: ' + projectId);
  console.log('\n' + '='.repeat(50) + '\n');

  // 1. Récupérer TOUTES les assignations du projet
  console.log('📋 1. TOUTES LES ASSIGNATIONS DU PROJET:');
  console.log('-'.repeat(40));
  
  const { data: assignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', projectId);
    
  if (assignError) {
    console.error('❌ Erreur:', assignError);
    return;
  }
  
  console.log(`✅ Nombre total d'assignations: ${assignments?.length || 0}\n`);
  
  for (const assignment of assignments || []) {
    console.log(`📌 Assignment ${assignment.id}:`);
    console.log(`   - Status: "${assignment.booking_status}"`);
    console.log(`   - Candidate ID: ${assignment.candidate_id || 'NULL ❌'}`);
    console.log(`   - Profile ID: ${assignment.profile_id || 'NULL'}`);
    console.log(`   - Job Title: ${assignment.job_title || 'N/A'}`);
    console.log(`   - Seniority: ${assignment.seniority || 'N/A'}`);
    
    // Si il y a un candidate_id, récupérer les infos
    if (assignment.candidate_id) {
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('email, first_name, last_name')
        .eq('id', assignment.candidate_id)
        .single();
      
      if (candidate) {
        console.log(`   - Candidat: ${candidate.email} (${candidate.first_name} ${candidate.last_name})`);
      }
    }
    
    // Si il y a un profile_id, récupérer les infos
    if (assignment.profile_id) {
      const { data: hrProfile } = await supabase
        .from('hr_profiles')
        .select('name')
        .eq('id', assignment.profile_id)
        .single();
      
      if (hrProfile) {
        console.log(`   - HR Profile: ${hrProfile.name}`);
      }
    }
    console.log('');
  }

  // 2. Analyser les statuts de booking
  console.log('\n📊 2. RÉPARTITION DES STATUTS:');
  console.log('-'.repeat(40));
  const statusCount = {};
  assignments?.forEach(a => {
    statusCount[a.booking_status] = (statusCount[a.booking_status] || 0) + 1;
  });
  
  for (const [status, count] of Object.entries(statusCount)) {
    const emoji = status === 'accepted' || status === 'booké' ? '✅' : 
                  status === 'recherche' ? '🔍' : '❓';
    console.log(`${emoji} ${status}: ${count} assignation(s)`);
  }

  // 3. Identifier le problème
  console.log('\n🔍 3. ANALYSE DU PROBLÈME:');
  console.log('-'.repeat(40));
  
  const acceptedAssignments = assignments?.filter(a => 
    a.booking_status === 'accepted' || a.booking_status === 'booké'
  ) || [];
  
  const searchingAssignments = assignments?.filter(a => 
    a.booking_status === 'recherche' || a.booking_status === 'draft'
  ) || [];
  
  console.log(`✅ Assignations acceptées: ${acceptedAssignments.length}`);
  console.log(`🔍 Assignations en recherche: ${searchingAssignments.length}`);
  
  if (searchingAssignments.length > 0) {
    console.log('\n⚠️  PROBLÈME IDENTIFIÉ:');
    console.log('Il y a des assignations en statut "recherche" qui ne sont pas acceptées!');
    console.log('L\'Assistant comptable est probablement dans ce cas.');
  }

  // 4. Chercher spécifiquement l'Assistant comptable
  console.log('\n👤 4. RECHERCHE DE L\'ASSISTANT COMPTABLE:');
  console.log('-'.repeat(40));
  
  // Dans les assignations
  const assistantAssignment = assignments?.find(a => 
    a.job_title?.toLowerCase().includes('assistant') ||
    a.job_title?.toLowerCase().includes('comptable')
  );
  
  if (assistantAssignment) {
    console.log('✅ Trouvé dans les assignations:');
    console.log(`   - Job: ${assistantAssignment.job_title}`);
    console.log(`   - Status: ${assistantAssignment.booking_status}`);
    console.log(`   - Candidate ID: ${assistantAssignment.candidate_id || 'NULL ❌'}`);
    
    if (assistantAssignment.booking_status === 'recherche') {
      console.log('\n⚠️  L\'Assistant est en status "recherche" !');
      console.log('   Il faut changer son status à "accepted" ou "booké"');
    }
  }

  // 5. Solution proposée
  console.log('\n💡 5. SOLUTION PROPOSÉE:');
  console.log('-'.repeat(40));
  console.log('Pour que l\'Assistant comptable apparaisse dans les membres:');
  console.log('1. ✅ Vérifier que booking_status = "accepted" ou "booké"');
  console.log('2. ✅ Vérifier qu\'il y a un candidate_id valide');
  console.log('3. ✅ Mettre à jour useProjectUsers.ts pour inclure tous les statuts valides');
  
  // 6. Comment fonctionne l'acceptation selon le code
  console.log('\n📖 6. COMMENT FONCTIONNE L\'ACCEPTATION:');
  console.log('-'.repeat(40));
  console.log('Selon CandidateMissionRequests.tsx:');
  console.log('1. Les candidats voient les missions en "recherche"');
  console.log('2. Ils peuvent accepter via le bouton "Accepter"');
  console.log('3. Cela appelle resource-booking avec action: "accept_mission"');
  console.log('4. Le booking_status devrait passer à "accepted"');
  console.log('\nMais si le candidat n\'a jamais accepté formellement,');
  console.log('l\'assignation reste en "recherche" et n\'apparaît pas!');
}

analyzeAcceptanceSystem().catch(console.error);