import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runDiagnostic() {
  const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
  
  console.log('=== DIAGNOSTIC COMPLET DU PROJET ===\n');
  
  // 1. Voir TOUTES les assignations
  console.log('1. TOUTES LES ASSIGNATIONS DU PROJET:');
  const { data: assignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      candidate_profiles(email, first_name, last_name),
      hr_profiles(name)
    `)
    .eq('project_id', projectId);
    
  if (assignError) {
    console.error('Erreur:', assignError);
  } else {
    console.log('Nombre total d\'assignations:', assignments?.length || 0);
    assignments?.forEach(a => {
      console.log(`- ID: ${a.id}`);
      console.log(`  Booking Status: ${a.booking_status}`);
      console.log(`  Candidate ID: ${a.candidate_id || 'NULL'}`);
      console.log(`  Profile ID: ${a.profile_id || 'NULL'}`);
      console.log(`  Candidate Email: ${a.candidate_profiles?.email || 'N/A'}`);
      console.log(`  HR Profile: ${a.hr_profiles?.name || 'N/A'}`);
      console.log('---');
    });
  }

  // 2. Chercher l'Assistant comptable dans candidate_profiles
  console.log('\n2. RECHERCHE DE L\'ASSISTANT COMPTABLE:');
  const { data: assistants, error: assistantError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .or('email.ilike.%assistant%,first_name.ilike.%assistant%,last_name.ilike.%comptable%,job_title.ilike.%comptable%,job_title.ilike.%assistant%');
    
  if (assistantError) {
    console.error('Erreur:', assistantError);
  } else {
    console.log('Candidats trouvés:', assistants?.length || 0);
    assistants?.forEach(a => {
      console.log(`- ${a.email} (${a.first_name} ${a.last_name}) - Job: ${a.job_title}`);
    });
  }

  // 3. Analyser le système d'acceptation dans CandidateMissionRequests
  console.log('\n3. COMMENT FONCTIONNE L\'ACCEPTATION:');
  console.log('D\'après CandidateMissionRequests.tsx:');
  console.log('- Les candidats voient les missions en status "recherche"');
  console.log('- Quand ils acceptent, la fonction resource-booking est appelée');
  console.log('- Action: accept_mission met à jour booking_status');
  
  // 4. Vérifier les différents statuts de booking
  console.log('\n4. STATUTS DE BOOKING DANS CE PROJET:');
  const { data: statuses } = await supabase
    .from('hr_resource_assignments')
    .select('booking_status')
    .eq('project_id', projectId);
    
  const statusCount = {};
  statuses?.forEach(s => {
    statusCount[s.booking_status] = (statusCount[s.booking_status] || 0) + 1;
  });
  console.log(statusCount);

  // 5. Voir si des assignations sont en "recherche"
  console.log('\n5. ASSIGNATIONS EN RECHERCHE (non acceptées):');
  const { data: searching } = await supabase
    .from('hr_resource_assignments')
    .select('*, hr_profiles(name)')
    .eq('project_id', projectId)
    .eq('booking_status', 'recherche');
    
  console.log('Assignations en recherche:', searching?.length || 0);
  searching?.forEach(s => {
    console.log(`- ${s.hr_profiles?.name || 'Profile ' + s.profile_id} - Candidate: ${s.candidate_id || 'NON ASSIGNÉ'}`);
  });

  // 6. SOLUTION PROPOSÉE
  console.log('\n=== SOLUTION PROPOSÉE ===');
  console.log('Le problème: L\'Assistant comptable a probablement:');
  console.log('1. Une assignation avec booking_status = "recherche" (non acceptée)');
  console.log('2. OU pas d\'assignation du tout');
  console.log('3. OU une assignation sans candidate_id');
  console.log('\nPour corriger, il faut:');
  console.log('1. Créer/trouver le candidate_profile de l\'Assistant');
  console.log('2. Mettre à jour l\'assignation avec le bon candidate_id');
  console.log('3. Changer le booking_status à "accepted" ou "booké"');
}

runDiagnostic().catch(console.error);