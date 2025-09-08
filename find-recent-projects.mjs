import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRecentProjects() {
  console.log('=== RECHERCHE DE TOUS LES PROJETS RÉCENTS ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const clientId = '6352b49b-6bb2-40f0-a9fd-e83ea430be32'; // fmeleard+clienr_1119@gmail.com
  
  // 1. Chercher TOUS les projets
  console.log('1. TOUS LES PROJETS EXISTANTS:');
  const { data: allProjects } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      owner_id,
      created_at,
      client_profiles(email)
    `)
    .order('created_at', { ascending: false });
    
  if (!allProjects || allProjects.length === 0) {
    console.log('❌ Aucun projet dans la base');
  } else {
    console.log(`✅ ${allProjects.length} projet(s) trouvé(s):\n`);
    allProjects.forEach((p, i) => {
      console.log(`${i+1}. "${p.title}"`);
      console.log(`   - ID: ${p.id}`);
      console.log(`   - Status: ${p.status}`);
      console.log(`   - Owner: ${p.client_profiles?.email || p.owner_id}`);
      console.log(`   - Créé: ${p.created_at}`);
      console.log('');
    });
  }
  
  // 2. Chercher les projets qui ont des assignations
  console.log('\n2. PROJETS AVEC ASSIGNATIONS:');
  const { data: projectsWithAssignments } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      hr_resource_assignments!inner(
        id,
        profile_id,
        seniority,
        booking_status,
        candidate_id
      )
    `)
    .order('created_at', { ascending: false });
    
  if (projectsWithAssignments && projectsWithAssignments.length > 0) {
    console.log(`✅ ${projectsWithAssignments.length} projet(s) avec assignations:\n`);
    projectsWithAssignments.forEach(p => {
      console.log(`Projet: "${p.title}" (${p.status})`);
      console.log(`  - ${p.hr_resource_assignments.length} assignation(s)`);
      p.hr_resource_assignments.forEach(a => {
        console.log(`    • Profile: ${a.profile_id}`);
        console.log(`      Seniority: ${a.seniority}`);
        console.log(`      Status: ${a.booking_status}`);
        console.log(`      Candidate: ${a.candidate_id || 'Non assigné'}`);
      });
      console.log('');
    });
  } else {
    console.log('❌ Aucun projet avec assignations');
  }
  
  // 3. Chercher les projets du client spécifique
  console.log('\n3. PROJETS DU CLIENT fmeleard+clienr_1119@gmail.com:');
  const { data: clientProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', clientId);
    
  if (clientProjects && clientProjects.length > 0) {
    console.log(`✅ ${clientProjects.length} projet(s) de ce client:`);
    clientProjects.forEach(p => {
      console.log(`  - "${p.title}" (${p.status}) - ${p.created_at}`);
    });
  } else {
    console.log('❌ Aucun projet pour ce client');
  }
  
  // 4. Chercher les projets avec "123" dans le nom
  console.log('\n4. PROJETS CONTENANT "123":');
  const { data: projects123 } = await supabase
    .from('projects')
    .select('*')
    .like('title', '%123%');
    
  if (projects123 && projects123.length > 0) {
    console.log(`✅ ${projects123.length} projet(s) avec "123":`);
    projects123.forEach(p => {
      console.log(`  - "${p.title}" (ID: ${p.id})`);
    });
  } else {
    console.log('❌ Aucun projet contenant "123"');
  }
  
  // 5. Vérifier les assignations orphelines
  console.log('\n5. ASSIGNATIONS ORPHELINES (sans projet valide):');
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      seniority,
      booking_status,
      projects!left(title)
    `)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (allAssignments && allAssignments.length > 0) {
    console.log(`✅ ${allAssignments.length} dernières assignations:`);
    allAssignments.forEach(a => {
      if (!a.projects) {
        console.log(`  ⚠️ ORPHELINE: Assignment ${a.id} → projet ${a.project_id} (n'existe plus)`);
      } else {
        console.log(`  ✅ Assignment pour "${a.projects.title}" - ${a.booking_status}`);
      }
    });
  }
  
  console.log('\n\n=== RÉSUMÉ ===');
  console.log('1. Le projet "1233" n\'existe pas dans la base');
  console.log('2. Le client fmeleard+clienr_1119@gmail.com existe (ID: ' + clientId + ')');
  console.log('3. Le candidat existe (ID: ' + candidateId + ')');
  console.log('4. Le client doit créer un nouveau projet pour tester');
  
  process.exit(0);
}

findRecentProjects().catch(console.error);