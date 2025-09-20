import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkCandidateProjects() {
  console.log('🔍 Recherche de l\'utilisateur fmeleard+cdp_2@gmail.com...\n');
  
  // 1. Trouver l'utilisateur
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'fmeleard+cdp_2@gmail.com')
    .single();
    
  if (userError) {
    console.error('❌ Erreur utilisateur:', userError);
    return;
  }
  
  console.log('✅ Utilisateur trouvé:');
  console.log('  - ID:', user.id);
  console.log('  - Email:', user.email);
  console.log('  - Nom:', user.first_name, user.last_name);
  console.log('  - Rôle:', user.role);
  
  // 2. Vérifier le profil candidat
  const { data: candidateProfile, error: candError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (candError) {
    console.error('❌ Pas de profil candidat:', candError);
    return;
  }
  
  console.log('\n📋 Profil candidat:');
  console.log('  - ID:', candidateProfile.id);
  console.log('  - Statut:', candidateProfile.status);
  console.log('  - Email:', candidateProfile.email);
  
  // 3. Rechercher TOUTES les assignations
  const { data: allAssignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        status,
        project_date,
        owner_id
      )
    `)
    .eq('candidate_id', user.id);
    
  if (assignError) {
    console.error('❌ Erreur assignations:', assignError);
    return;
  }
  
  console.log(`\n📊 Assignations trouvées: ${allAssignments?.length || 0}`);
  
  if (allAssignments && allAssignments.length > 0) {
    console.log('\n📌 Détail des assignations:');
    allAssignments.forEach((assignment, i) => {
      console.log(`\n  ${i + 1}. Assignment ID: ${assignment.id}`);
      console.log(`     - booking_status: ${assignment.booking_status}`);
      console.log(`     - project_id: ${assignment.project_id}`);
      console.log(`     - profile_id: ${assignment.profile_id}`);
      console.log(`     - candidate_id: ${assignment.candidate_id}`);
      
      if (assignment.projects) {
        console.log(`     📁 Projet: ${assignment.projects.title}`);
        console.log(`        - Status projet: ${assignment.projects.status}`);
        console.log(`        - Date: ${assignment.projects.project_date}`);
      } else {
        console.log('     ⚠️ Pas de données projet jointes');
      }
    });
    
    // Compter par statut
    const acceptedAssignments = allAssignments.filter(a => a.booking_status === 'accepted');
    const activeProjects = acceptedAssignments.filter(a => a.projects?.status === 'play');
    
    console.log('\n📈 Résumé:');
    console.log(`  - Total assignations: ${allAssignments.length}`);
    console.log(`  - Assignations acceptées: ${acceptedAssignments.length}`);
    console.log(`  - Projets avec status 'play': ${activeProjects.length}`);
    console.log(`  - Projets avec autre status:`, acceptedAssignments.filter(a => a.projects?.status !== 'play').map(a => ({
      title: a.projects?.title,
      status: a.projects?.status
    })));
  }
  
  // 4. Vérifier directement les projets
  console.log('\n🔍 Vérification directe des projets via assignments acceptées...');
  
  const acceptedProjectIds = allAssignments?.filter(a => a.booking_status === 'accepted').map(a => a.project_id) || [];
  
  if (acceptedProjectIds.length > 0) {
    const { data: directProjects } = await supabase
      .from('projects')
      .select('*')
      .in('id', acceptedProjectIds);
      
    if (directProjects && directProjects.length > 0) {
      console.log('\n📂 Projets directs trouvés:');
      directProjects.forEach(p => {
        console.log(`  - ${p.title}: status='${p.status}', date='${p.project_date}'`);
      });
    }
  }
}

checkCandidateProjects().catch(console.error);
