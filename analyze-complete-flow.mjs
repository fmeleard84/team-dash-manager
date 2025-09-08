import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCompleteFlow() {
  console.log('=== ANALYSE COMPLÈTE DU FLUX ===\n');
  
  // Étape 1 : Se connecter en tant que client
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  const clientPassword = 'test123456'; // À adapter selon le mot de passe
  
  console.log('1. CONNEXION CLIENT:', clientEmail);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: clientEmail,
    password: clientPassword
  });
  
  if (authError) {
    console.error('❌ Erreur connexion client:', authError.message);
    console.log('\nTentative sans authentification...\n');
  } else {
    console.log('✅ Client connecté:', authData.user.id);
  }
  
  // Étape 2 : Récupérer les projets du client
  console.log('\n2. PROJETS DU CLIENT:');
  const userId = authData?.user?.id || '6352b49b-6bb2-40f0-a9fd-e83ea430be32';
  
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId);
  
  if (projectsError) {
    console.error('❌ Erreur récupération projets:', projectsError);
  } else if (projects && projects.length > 0) {
    console.log(`✅ ${projects.length} projet(s) trouvé(s):`);
    
    for (const project of projects) {
      console.log(`\n--- Projet: ${project.title} ---`);
      console.log('  ID:', project.id);
      console.log('  Status:', project.status);
      console.log('  Date:', project.project_date);
      console.log('  Owner ID:', project.owner_id);
      
      // Étape 3 : Vérifier les ressources de ce projet
      const { data: resources, error: resourcesError } = await supabase
        .from('hr_resources')
        .select(`
          *,
          hr_profiles(label, name)
        `)
        .eq('project_id', project.id);
      
      if (resources && resources.length > 0) {
        console.log(`\n  RESSOURCES (${resources.length}):`);
        resources.forEach(r => {
          console.log(`  - Resource ID: ${r.id}`);
          console.log(`    Profile: ${r.hr_profiles?.label || r.profile_id}`);
          console.log(`    Seniority: ${r.seniority}`);
          console.log(`    Languages: ${r.languages}`);
          console.log(`    Expertises: ${r.expertise}`);
        });
        
        // Étape 4 : Vérifier les assignations pour ces ressources
        for (const resource of resources) {
          const { data: assignments, error: assignError } = await supabase
            .from('hr_resource_assignments')
            .select('*')
            .eq('resource_id', resource.id);
          
          if (assignments && assignments.length > 0) {
            console.log(`\n  ASSIGNATIONS pour resource ${resource.id}:`);
            assignments.forEach(a => {
              console.log(`  - Assignment ID: ${a.id}`);
              console.log(`    Candidate ID: ${a.candidate_id}`);
              console.log(`    Booking Status: ${a.booking_status}`);
              console.log(`    Profile ID: ${a.profile_id}`);
              console.log(`    Seniority: ${a.seniority}`);
              console.log(`    Languages: ${a.languages}`);
              console.log(`    Expertises: ${a.expertises}`);
            });
          } else {
            console.log(`  ❌ Pas d'assignation pour resource ${resource.id}`);
          }
        }
      } else {
        console.log('  ❌ Aucune ressource définie pour ce projet');
      }
    }
  } else {
    console.log('❌ Aucun projet trouvé pour ce client');
  }
  
  // Étape 5 : Vérifier côté candidat
  console.log('\n\n=== CÔTÉ CANDIDAT ===');
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
  
  if (candidate) {
    console.log('CANDIDAT:', candidateEmail);
    console.log('- ID:', candidate.id);
    console.log('- Profile ID:', candidate.profile_id);
    console.log('- Seniority:', candidate.seniority);
    console.log('- Status:', candidate.status);
    
    // Recherche des assignations pour ce candidat
    const { data: candidateAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects(title, status)
      `)
      .or(`candidate_id.eq.${candidate.id},booking_status.eq.recherche`);
    
    console.log('\nASSIGNATIONS VISIBLES POUR LE CANDIDAT:');
    if (candidateAssignments && candidateAssignments.length > 0) {
      const visibleAssignments = candidateAssignments.filter(a => {
        // Logique de filtrage du CandidateDashboard
        if (a.candidate_id === candidate.id) return true;
        if (a.candidate_id && a.candidate_id !== candidate.id) return false;
        if (a.booking_status === 'recherche') {
          const profileMatch = a.profile_id === candidate.profile_id;
          const seniorityMatch = a.seniority === candidate.seniority;
          const statusMatch = candidate.status !== 'qualification';
          
          console.log(`\n  Checking assignment ${a.id}:`);
          console.log(`    Profile match: ${profileMatch} (${a.profile_id} vs ${candidate.profile_id})`);
          console.log(`    Seniority match: ${seniorityMatch} (${a.seniority} vs ${candidate.seniority})`);
          console.log(`    Status OK: ${statusMatch} (${candidate.status})`);
          
          return profileMatch && seniorityMatch && statusMatch;
        }
        return false;
      });
      
      console.log(`\n✅ ${visibleAssignments.length} assignation(s) visible(s) après filtrage`);
      visibleAssignments.forEach(a => {
        console.log(`- Projet: ${a.projects?.title}`);
        console.log(`  Booking Status: ${a.booking_status}`);
        console.log(`  Project Status: ${a.projects?.status}`);
      });
    } else {
      console.log('❌ Aucune assignation trouvée');
    }
  }
  
  // Déconnexion
  if (authData) {
    await supabase.auth.signOut();
  }
  
  process.exit(0);
}

analyzeCompleteFlow().catch(console.error);