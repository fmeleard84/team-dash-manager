import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function analyze() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  console.log('🔍 Analyse complète avec SERVICE KEY...\n');

  // 1. Chercher TOUS les projets récents
  console.log('📁 TOUS les projets récents (service key):');
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allProjects && allProjects.length > 0) {
    allProjects.forEach(p => {
      console.log(`  - "${p.title}" (status: ${p.status}, créé: ${p.created_at})`);
    });

    // Chercher projet avec "New" ou "key"
    const targetProject = allProjects.find(p =>
      p.title.toLowerCase().includes('new') ||
      p.title.toLowerCase().includes('key')
    );

    if (targetProject) {
      console.log(`\n✅ Projet trouvé: "${targetProject.title}" (ID: ${targetProject.id})`);

      // 2. Vérifier les assignments sur ce projet
      console.log('\n📊 Assignments sur ce projet:');
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', targetProject.id);

      if (assignments && assignments.length > 0) {
        console.log(`  Total: ${assignments.length} assignment(s)`);

        assignments.forEach(a => {
          console.log(`\n  Assignment ID: ${a.id}`);
          console.log(`    - booking_status: ${a.booking_status}`);
          console.log(`    - profile_id: ${a.profile_id}`);
          console.log(`    - candidate_id: ${a.candidate_id}`);
          console.log(`    - seniority: ${a.seniority}`);

          if (a.candidate_id === userId) {
            console.log('    ✅ NOTRE CANDIDAT EST ASSIGNÉ!');
          }
        });

        // 3. Analyser pourquoi "Non défini"
        const ourAssignment = assignments.find(a => a.candidate_id === userId);
        if (ourAssignment) {
          console.log('\n🔍 Analyse du problème "Non défini":');
          console.log(`  profile_id dans assignment: ${ourAssignment.profile_id}`);

          if (ourAssignment.profile_id) {
            const { data: profile } = await supabase
              .from('hr_profiles')
              .select('*')
              .eq('id', ourAssignment.profile_id)
              .single();

            if (profile) {
              console.log('  ✅ hr_profiles trouvé:');
              console.log(`    - name: ${profile.name}`);
              console.log(`    - category_id: ${profile.category_id}`);
            } else {
              console.log(`  ❌ hr_profiles introuvable pour ID: ${ourAssignment.profile_id}`);
            }
          } else {
            console.log('  ❌ profile_id est NULL dans assignment');
          }
        } else {
          console.log('\n⚠️ Le candidat n\'est pas assigné à ce projet');
        }
      } else {
        console.log('  Aucun assignment trouvé');
      }
    } else {
      console.log('\n❌ Aucun projet avec "New" ou "key" trouvé');
    }
  } else {
    console.log('  Aucun projet trouvé');
  }

  // 4. Vérifier TOUS les assignments du candidat
  console.log('\n📊 TOUS les assignments du candidat:');
  const { data: candidateAssignments } = await supabase
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

  if (candidateAssignments && candidateAssignments.length > 0) {
    console.log(`  Total: ${candidateAssignments.length} assignment(s)`);
    candidateAssignments.forEach(a => {
      const projectTitle = a.projects ? a.projects.title : 'N/A';
      const projectStatus = a.projects ? a.projects.status : 'N/A';
      const profileName = a.hr_profiles ? a.hr_profiles.name : 'NON DEFINI';
      console.log(`  - Projet: "${projectTitle}", status: ${projectStatus}, booking: ${a.booking_status}`);
      console.log(`    Métier: ${profileName}`);
    });
  } else {
    console.log('  Aucun assignment trouvé pour ce candidat');
  }

  // 5. Vérifier les assignments en recherche sans candidat assigné
  console.log('\n🔎 Assignments en recherche (sans candidat):');
  const { data: searchingAssignments } = await supabase
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
    .eq('booking_status', 'recherche')
    .is('candidate_id', null);

  if (searchingAssignments && searchingAssignments.length > 0) {
    console.log(`  Total: ${searchingAssignments.length} postes en recherche`);
    searchingAssignments.forEach(a => {
      const projectTitle = a.projects ? a.projects.title : 'N/A';
      const profileName = a.hr_profiles ? a.hr_profiles.name : 'N/A';
      console.log(`  - Projet: "${projectTitle}", recherche: ${profileName}`);
    });
  } else {
    console.log('  Aucun poste en recherche active');
  }
}

analyze().catch(console.error);