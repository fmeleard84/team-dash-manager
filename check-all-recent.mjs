import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkAll() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  console.log('🔍 Recherche de TOUS les projets récents...\n');

  // 1. Les 10 derniers projets créés
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, project_date')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('📁 10 derniers projets créés:');
  if (recentProjects) {
    recentProjects.forEach(p => {
      console.log(`  - ${p.title} (status: ${p.status}, created: ${p.created_at})`);
    });
  }

  // 2. Recherche avec LIKE pour "key"
  console.log('\n🔍 Recherche projets contenant "key" ou "New"...');
  const { data: keyProjects } = await supabase
    .from('projects')
    .select('id, title, status')
    .or('title.ilike.%key%,title.ilike.%New%');

  if (keyProjects && keyProjects.length > 0) {
    console.log('Projets trouvés:');
    keyProjects.forEach(p => {
      console.log(`  - "${p.title}" (ID: ${p.id}, status: ${p.status})`);
    });

    // Pour chaque projet trouvé, vérifier les assignments
    for (const project of keyProjects) {
      console.log(`\n  📊 Assignments pour "${project.title}":`);
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          booking_status,
          candidate_id,
          profile_id,
          seniority,
          hr_profiles (
            id,
            name
          )
        `)
        .eq('project_id', project.id);

      if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
          const isOurCandidate = a.candidate_id === userId;
          const marker = isOurCandidate ? ' ✅ NOTRE CANDIDAT' : '';
          const profileName = a.hr_profiles ? a.hr_profiles.name : 'NON DEFINI';
          console.log(`    - booking: ${a.booking_status}, profile: ${profileName}${marker}`);
          if (isOurCandidate) {
            console.log(`      Details: profile_id=${a.profile_id}, seniority=${a.seniority}`);
          }
        });
      } else {
        console.log('    Aucun assignment');
      }
    }
  } else {
    console.log('Aucun projet trouvé avec "key" ou "New"');
  }

  // 3. Vérifier TOUS les assignments de notre candidat
  console.log('\n📊 TOUS les assignments du candidat:');
  const { data: userAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        title,
        status
      ),
      hr_profiles (
        name
      )
    `)
    .eq('candidate_id', userId);

  console.log(`Nombre total: ${userAssignments?.length || 0}`);
  if (userAssignments && userAssignments.length > 0) {
    userAssignments.forEach(a => {
      const projectTitle = a.projects ? a.projects.title : 'N/A';
      const projectStatus = a.projects ? a.projects.status : 'N/A';
      const profileName = a.hr_profiles ? a.hr_profiles.name : 'NON DEFINI (profile_id=' + a.profile_id + ')';
      console.log(`  - Projet: "${projectTitle}", status projet: ${projectStatus}, booking: ${a.booking_status}`);
      console.log(`    Métier: ${profileName}`);
    });
  }
}

checkAll().catch(console.error);