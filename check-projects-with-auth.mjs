import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.nDQXLDKKCNzRMVo4X7-Cw9nZomHxVXzXRzQw_Ev5VMA';

// Utiliser la clé service_role pour bypasser les RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProjectsWithAuth() {
  console.log('=== VÉRIFICATION DES PROJETS AVEC SERVICE ROLE ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  // 1. Récupérer TOUS les projets (bypass RLS)
  console.log('1. TOUS LES PROJETS (sans filtre RLS):');
  const { data: allProjects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.log('❌ Erreur:', error);
  } else if (!allProjects || allProjects.length === 0) {
    console.log('❌ Aucun projet trouvé');
  } else {
    console.log(`✅ ${allProjects.length} projet(s) trouvé(s):\n`);
    
    // Chercher spécifiquement les projets mentionnés
    const targetProjects = ['1233', 'test1217', 'test1155'];
    
    targetProjects.forEach(title => {
      const project = allProjects.find(p => p.title === title);
      if (project) {
        console.log(`\n📌 PROJET "${title}" TROUVÉ:`);
        console.log('   - ID:', project.id);
        console.log('   - Owner ID:', project.owner_id);
        console.log('   - Status:', project.status);
        console.log('   - Start Date:', project.start_date);
        console.log('   - Created:', project.created_at);
      } else {
        console.log(`\n❌ Projet "${title}" non trouvé`);
      }
    });
    
    // Lister tous les projets
    console.log('\n--- LISTE COMPLÈTE ---');
    allProjects.forEach(p => {
      console.log(`- "${p.title}" (${p.status}) - Owner: ${p.owner_id}`);
    });
  }
  
  // 2. Vérifier les assignations pour ces projets
  console.log('\n\n2. ASSIGNATIONS POUR CES PROJETS:');
  
  const projectTitles = ['1233', 'test1217', 'test1155'];
  
  for (const title of projectTitles) {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('title', title)
      .single();
      
    if (project) {
      console.log(`\n📌 Assignations pour "${title}" (ID: ${project.id}):`);
      
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', project.id);
        
      if (assignments && assignments.length > 0) {
        console.log(`   ✅ ${assignments.length} assignation(s):`);
        assignments.forEach(a => {
          console.log(`     - Profile: ${a.profile_id}, Seniority: ${a.seniority}, Status: ${a.booking_status}`);
          console.log(`       Candidate: ${a.candidate_id || 'Non assigné'}`);
        });
      } else {
        console.log('   ❌ Aucune assignation');
      }
    }
  }
  
  // 3. Vérifier le candidat
  console.log('\n\n3. CANDIDAT PROFILE:');
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (candidate) {
    console.log('✅ Candidat trouvé:');
    console.log('   - ID:', candidate.id);
    console.log('   - Profile ID:', candidate.profile_id);
    console.log('   - Seniority:', candidate.seniority);
    console.log('   - Status:', candidate.status);
  }
  
  // 4. Simuler le matching pour voir ce qui devrait apparaître
  console.log('\n\n4. SIMULATION DU MATCHING CANDIDAT:');
  
  if (candidate) {
    const { data: matchingAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects!inner(
          id,
          title,
          status,
          owner_id
        )
      `)
      .eq('profile_id', candidate.profile_id)
      .eq('seniority', candidate.seniority)
      .or(`booking_status.eq.recherche,candidate_id.eq.${candidateId}`);
      
    if (matchingAssignments && matchingAssignments.length > 0) {
      console.log(`✅ ${matchingAssignments.length} assignation(s) devraient être visibles:`);
      matchingAssignments.forEach(a => {
        console.log(`\n   - Projet: "${a.projects.title}"`);
        console.log(`     Status projet: ${a.projects.status}`);
        console.log(`     Booking status: ${a.booking_status}`);
        console.log(`     Profile match: ✅`);
        console.log(`     Seniority match: ✅`);
      });
    } else {
      console.log('❌ Aucune assignation ne matche les critères du candidat');
      console.log('\nCritères de matching:');
      console.log(`   - profile_id = ${candidate.profile_id}`);
      console.log(`   - seniority = ${candidate.seniority}`);
      console.log(`   - booking_status = 'recherche' OU candidate_id = ${candidateId}`);
    }
  }
  
  // 5. Vérifier si c'est un problème de statut de projet
  console.log('\n\n5. VÉRIFICATION DES STATUTS DE PROJETS:');
  const { data: projectStatuses } = await supabase
    .from('projects')
    .select('title, status')
    .in('title', ['1233', 'test1217', 'test1155']);
    
  if (projectStatuses) {
    projectStatuses.forEach(p => {
      console.log(`   - "${p.title}": status = ${p.status}`);
      if (p.status !== 'play') {
        console.log(`     ⚠️ Status n'est pas "play" - peut-être filtré côté candidat?`);
      }
    });
  }
  
  process.exit(0);
}

checkProjectsWithAuth().catch(console.error);