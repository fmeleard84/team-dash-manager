import { createClient } from '@supabase/supabase-js';

// BONNES CLÉS depuis .env.supabase
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkProjects() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  console.log('🔍 Test avec la VRAIE service key...\n');

  // 1. Vérifier les projets
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (projectsError) {
    console.log('❌ Erreur:', projectsError);
    return;
  }

  console.log(`📁 Projets trouvés: ${projects?.length || 0}`);

  if (projects && projects.length > 0) {
    projects.forEach(p => {
      console.log(`  - "${p.title}" (status: ${p.status})`);
    });

    // Chercher "Projet New key"
    const newKeyProject = projects.find(p =>
      p.title.toLowerCase().includes('new') ||
      p.title.toLowerCase().includes('key')
    );

    if (newKeyProject) {
      console.log(`\n✅ TROUVÉ: "${newKeyProject.title}" (ID: ${newKeyProject.id})`);

      // Vérifier les assignments
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            id,
            name,
            category_id
          )
        `)
        .eq('project_id', newKeyProject.id);

      console.log(`\n📊 Assignments sur ce projet: ${assignments?.length || 0}`);

      if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
          console.log(`\n  Assignment ID: ${a.id}`);
          console.log(`    - booking_status: ${a.booking_status}`);
          console.log(`    - profile_id: ${a.profile_id}`);
          console.log(`    - candidate_id: ${a.candidate_id || 'NULL'}`);
          console.log(`    - Métier: ${a.hr_profiles?.name || 'NON DÉFINI'}`);

          if (a.candidate_id === userId) {
            console.log('    ✅ NOTRE CANDIDAT!');
          }
        });

        // Analyser pourquoi "Non défini"
        const problemAssignment = assignments.find(a => !a.hr_profiles?.name);
        if (problemAssignment) {
          console.log('\n⚠️ Problème "Non défini" détecté:');
          console.log(`  - profile_id dans assignment: ${problemAssignment.profile_id}`);

          if (problemAssignment.profile_id) {
            // Vérifier directement le profil
            const { data: profile } = await supabase
              .from('hr_profiles')
              .select('*')
              .eq('id', problemAssignment.profile_id)
              .single();

            if (profile) {
              console.log('  ✅ hr_profiles existe:');
              console.log(`    - name: ${profile.name}`);
              console.log('  → Le problème vient de la jointure ou du filtrage RLS');
            } else {
              console.log('  ❌ hr_profiles introuvable pour cet ID');
            }
          }
        }
      }
    }
  }

  // 2. Vérifier les assignments du candidat
  console.log('\n📊 Assignments du candidat:');
  const { data: userAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (title, status),
      hr_profiles (name)
    `)
    .eq('candidate_id', userId);

  if (userAssignments && userAssignments.length > 0) {
    console.log(`  Total: ${userAssignments.length}`);
    userAssignments.forEach(a => {
      const projectTitle = a.projects?.title || 'N/A';
      const profileName = a.hr_profiles?.name || 'NON DÉFINI';
      console.log(`  - Projet: "${projectTitle}", Métier: ${profileName}, Booking: ${a.booking_status}`);
    });
  } else {
    console.log('  Aucun assignment pour ce candidat');
  }
}

checkProjects().catch(console.error);