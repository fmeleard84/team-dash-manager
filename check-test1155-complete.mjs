import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTest1155Complete() {
  console.log('=== ANALYSE COMPLÈTE DU PROJET test1155 ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const candidateProfileId = '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e';
  const candidateSeniority = 'intermediate';
  
  // 1. Chercher le projet test1155
  console.log('1. RECHERCHE DU PROJET test1155:');
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('title', 'test1155')
    .single();
    
  if (!project) {
    console.log('❌ Projet test1155 introuvable');
    process.exit(1);
  }
  
  console.log('✅ Projet trouvé:');
  console.log('  - ID:', project.id);
  console.log('  - Title:', project.title);
  console.log('  - Owner ID:', project.owner_id);
  console.log('  - Status:', project.status);
  console.log('  - Created:', project.created_at);
  
  // 2. Vérifier les ressources HR
  console.log('\n2. RESSOURCES HR DU PROJET:');
  const { data: resources } = await supabase
    .from('hr_resources')
    .select('*')
    .eq('project_id', project.id);
    
  if (!resources || resources.length === 0) {
    console.log('❌ PROBLÈME: Aucune ressource HR définie');
    console.log('   → Le booking crée des hr_resource_assignments');
    console.log('   → MAIS il faut d\'abord des hr_resources !');
  } else {
    console.log(`✅ ${resources.length} ressource(s) trouvée(s):`);
    resources.forEach(r => {
      console.log(`\n  Resource ID: ${r.id}`);
      console.log(`  - Profile ID: ${r.profile_id}`);
      console.log(`  - Seniority: ${r.seniority}`);
      console.log(`  - Languages: ${JSON.stringify(r.languages)}`);
      console.log(`  - Expertise: ${JSON.stringify(r.expertise)}`);
    });
  }
  
  // 3. Vérifier les assignations
  console.log('\n3. ASSIGNATIONS (hr_resource_assignments):');
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', project.id);
    
  if (!assignments || assignments.length === 0) {
    console.log('❌ PROBLÈME: Aucune assignation créée');
    console.log('\nRAISON PROBABLE:');
    console.log('Le "booking" côté client doit:');
    console.log('1. Créer des entrées dans hr_resource_assignments');
    console.log('2. Avec booking_status = "recherche"');
    console.log('3. ET les bons critères (profile_id, seniority, etc.)');
    console.log('\nLE BOOKING N\'A PAS CRÉÉ LES ASSIGNATIONS !');
  } else {
    console.log(`Trouvé ${assignments.length} assignation(s):`);
    assignments.forEach(a => {
      console.log(`\n  Assignment ID: ${a.id}`);
      console.log(`  - Resource ID: ${a.resource_id}`);
      console.log(`  - Candidate ID: ${a.candidate_id || 'NULL (pas encore assigné)'}`);
      console.log(`  - Profile ID: ${a.profile_id}`);
      console.log(`  - Seniority: ${a.seniority}`);
      console.log(`  - Booking Status: ${a.booking_status}`);
      console.log(`  - Languages: ${JSON.stringify(a.languages)}`);
      console.log(`  - Expertises: ${JSON.stringify(a.expertises)}`);
    });
  }
  
  // 4. Diagnostic final
  console.log('\n\n=== DIAGNOSTIC FINAL ===\n');
  
  if (!resources || resources.length === 0) {
    console.log('❌ PROBLÈME 1: Pas de hr_resources');
    console.log('   → Le client doit définir les ressources dans ReactFlow');
    console.log('   → Cela crée des entrées dans hr_resources');
  }
  
  if (!assignments || assignments.length === 0) {
    console.log('\n❌ PROBLÈME 2: Pas de hr_resource_assignments');
    console.log('   → Le "booking" doit créer des assignations');
    console.log('   → Avec booking_status = "recherche"');
    console.log('   → Le candidat ne peut pas voir le projet sans assignation !');
  } else {
    // Vérifier le matching
    const matchingAssignments = assignments.filter(a => {
      const profileMatch = a.profile_id === candidateProfileId;
      const seniorityMatch = a.seniority === candidateSeniority;
      const statusMatch = a.booking_status === 'recherche' || a.candidate_id === candidateId;
      
      console.log('\nVérification matching pour assignment', a.id);
      console.log('  - Profile match:', profileMatch, `(${a.profile_id} vs ${candidateProfileId})`);
      console.log('  - Seniority match:', seniorityMatch, `(${a.seniority} vs ${candidateSeniority})`);
      console.log('  - Status OK:', statusMatch, `(${a.booking_status})`);
      
      return profileMatch && seniorityMatch && statusMatch;
    });
    
    if (matchingAssignments.length === 0) {
      console.log('\n❌ PROBLÈME 3: Aucune assignation ne matche le candidat');
    } else {
      console.log('\n✅ Le candidat devrait voir le projet');
    }
  }
  
  console.log('\n\n=== FLUX CORRECT ===');
  console.log('1. Client crée projet → ✅');
  console.log('2. Client définit ressources dans ReactFlow → Creates hr_resources');
  console.log('3. Client clique "Booker équipe" → Creates hr_resource_assignments avec:');
  console.log('   - project_id = ID du projet');
  console.log('   - resource_id = ID de la ressource HR'); 
  console.log('   - profile_id, seniority, languages, expertises copiés depuis hr_resources');
  console.log('   - booking_status = "recherche"');
  console.log('   - candidate_id = NULL (pas encore assigné)');
  console.log('4. Candidat voit le projet SI:');
  console.log('   - profile_id correspond');
  console.log('   - seniority correspond');
  console.log('   - status != "qualification"');
  console.log('   - langues/expertises correspondent');
  
  process.exit(0);
}

checkTest1155Complete().catch(console.error);