import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingIssue() {
  console.log('=== ANALYSE DU PROBLÈME DE BOOKING ===\n');

  const projectId = 'cff8241a-0d0e-46bc-bd95-938c628519eb';
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const candidateProfileId = '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e';
  
  // 1. Vérifier le projet
  console.log('1. PROJET test1155:');
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
    
  if (project) {
    console.log('✅ Projet trouvé:');
    console.log('  - ID:', project.id);
    console.log('  - Title:', project.title);
    console.log('  - Owner ID:', project.owner_id);
    console.log('  - Status:', project.status);
    console.log('  - Date:', project.project_date);
  } else {
    console.log('❌ Projet non trouvé');
  }
  
  // 2. Vérifier les ressources du projet
  console.log('\n2. RESSOURCES DU PROJET:');
  const { data: resources } = await supabase
    .from('hr_resources')
    .select('*')
    .eq('project_id', projectId);
    
  if (resources && resources.length > 0) {
    console.log(`✅ ${resources.length} ressource(s) trouvée(s):`);
    resources.forEach(r => {
      console.log(`\n  Resource ID: ${r.id}`);
      console.log(`  - Profile ID: ${r.profile_id}`);
      console.log(`  - Seniority: ${r.seniority}`);
      console.log(`  - Languages: ${JSON.stringify(r.languages)}`);
      console.log(`  - Expertise: ${JSON.stringify(r.expertise)}`);
      console.log(`  - Price: ${r.calculated_price}`);
    });
  } else {
    console.log('❌ Aucune ressource trouvée');
  }
  
  // 3. Vérifier les assignations
  console.log('\n3. ASSIGNATIONS (hr_resource_assignments):');
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', projectId);
    
  if (assignments && assignments.length > 0) {
    console.log(`✅ ${assignments.length} assignation(s) trouvée(s):`);
    assignments.forEach(a => {
      console.log(`\n  Assignment ID: ${a.id}`);
      console.log(`  - Resource ID: ${a.resource_id}`);
      console.log(`  - Project ID: ${a.project_id}`);
      console.log(`  - Candidate ID: ${a.candidate_id}`);
      console.log(`  - Profile ID: ${a.profile_id}`);
      console.log(`  - Seniority: ${a.seniority}`);
      console.log(`  - Languages: ${JSON.stringify(a.languages)}`);
      console.log(`  - Expertises: ${JSON.stringify(a.expertises)}`);
      console.log(`  - Booking Status: ${a.booking_status}`);
      console.log(`  - Price: ${a.calculated_price}`);
      
      // Vérifier le matching avec le candidat
      console.log('\n  MATCHING CANDIDAT:');
      console.log(`  - Candidate ID match: ${a.candidate_id === candidateId ? '✅' : '❌'} (${a.candidate_id} vs ${candidateId})`);
      console.log(`  - Profile ID match: ${a.profile_id === candidateProfileId ? '✅' : '❌'} (${a.profile_id} vs ${candidateProfileId})`);
      console.log(`  - Seniority match: ${a.seniority === 'intermediate' ? '✅' : '❌'}`);
    });
  } else {
    console.log('❌ Aucune assignation trouvée pour ce projet');
  }
  
  // 4. Requête comme dans CandidateDashboard
  console.log('\n4. REQUÊTE COMME CANDIDATDASHBOARD:');
  const { data: dashboardAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects:project_id (
        id,
        title,
        description,
        status,
        project_date,
        due_date,
        client_budget,
        owner_id
      )
    `)
    .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);
    
  console.log(`\nTotal assignations visibles: ${dashboardAssignments?.length || 0}`);
  
  const projectAssignments = dashboardAssignments?.filter(a => a.project_id === projectId);
  if (projectAssignments && projectAssignments.length > 0) {
    console.log(`\n✅ Assignations pour ce projet:`);
    projectAssignments.forEach(a => {
      console.log(`  - Booking status: ${a.booking_status}`);
      console.log(`  - Candidate ID: ${a.candidate_id}`);
      console.log(`  - Visible pour candidat?: ${
        a.candidate_id === candidateId || 
        (a.booking_status === 'recherche' && 
         a.profile_id === candidateProfileId && 
         a.seniority === 'intermediate')
        ? '✅ OUI' : '❌ NON'
      }`);
    });
  } else {
    console.log('❌ Aucune assignation visible pour ce projet');
  }
  
  // 5. Diagnostic
  console.log('\n\n=== DIAGNOSTIC ===');
  console.log('\nPOSSIBLES PROBLÈMES:');
  console.log('1. Les assignations ne sont pas créées lors du booking');
  console.log('2. Les assignations sont créées mais avec des mauvais IDs');
  console.log('3. Le booking_status n\'est pas "recherche" ou "accepted"');
  console.log('4. Le candidate_id n\'est pas défini dans l\'assignation');
  console.log('5. Le profil/séniorité ne correspondent pas');
  
  process.exit(0);
}

checkBookingIssue().catch(console.error);