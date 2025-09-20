import { createClient } from '@supabase/supabase-js';

// BONNES CLÉS fournies par l'utilisateur
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.TYqWbJrMQgxOhg6LyxWBaQ3iY7xHFSMXwhWHh9YD_3g';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function diagnose() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310'; // Francis Meleard

  console.log('🔍 Diagnostic avec les BONNES clés...\n');

  // 1. Vérifier les projets
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (projectsError) {
    console.log('❌ Erreur:', projectsError);
    return;
  }

  console.log(`📁 Projets dans la base: ${projects?.length || 0}`);
  if (projects && projects.length > 0) {
    projects.forEach(p => {
      console.log(`  - "${p.title}" (status: ${p.status}, créé: ${new Date(p.created_at).toLocaleDateString()})`);
    });

    // Chercher "Projet New key"
    const newKeyProject = projects.find(p =>
      p.title.toLowerCase().includes('new') ||
      p.title.toLowerCase().includes('key')
    );

    if (newKeyProject) {
      console.log(`\n✅ PROJET TROUVÉ: "${newKeyProject.title}"`);
      console.log(`  - ID: ${newKeyProject.id}`);
      console.log(`  - Status: ${newKeyProject.status}`);
      console.log(`  - Owner: ${newKeyProject.owner_id}`);

      // Vérifier les assignments
      console.log('\n📊 Assignments sur ce projet:');
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

      if (assignments && assignments.length > 0) {
        console.log(`  Total: ${assignments.length} assignment(s)`);
        assignments.forEach((a, i) => {
          console.log(`\n  ${i+1}. Assignment ID: ${a.id}`);
          console.log(`     - booking_status: ${a.booking_status}`);
          console.log(`     - profile_id: ${a.profile_id}`);
          console.log(`     - candidate_id: ${a.candidate_id || 'NULL (pas encore assigné)'}`);
          console.log(`     - Métier recherché: ${a.hr_profiles?.name || '❌ NON DÉFINI (profil manquant)'}`);

          if (a.candidate_id === userId) {
            console.log('     ✅ NOTRE CANDIDAT EST ASSIGNÉ!');
          }
        });

        // Diagnostic du problème "Non défini"
        const problemAssignments = assignments.filter(a => !a.hr_profiles?.name);
        if (problemAssignments.length > 0) {
          console.log('\n⚠️ PROBLÈME IDENTIFIÉ: Assignments sans métier défini');
          for (const prob of problemAssignments) {
            if (prob.profile_id) {
              // Vérifier si le profil existe
              const { data: profile } = await supabase
                .from('hr_profiles')
                .select('*')
                .eq('id', prob.profile_id)
                .single();

              if (profile) {
                console.log(`  - Profile ${prob.profile_id} existe avec name="${profile.name}"`);
                console.log('    → La jointure ne fonctionne pas (problème de requête)');
              } else {
                console.log(`  - Profile ${prob.profile_id} N'EXISTE PAS dans hr_profiles`);
                console.log('    → Données corrompues ou profil supprimé');
              }
            } else {
              console.log('  - profile_id est NULL dans l\'assignment');
              console.log('    → Assignment incomplet');
            }
          }
        }
      } else {
        console.log('  ❌ AUCUN ASSIGNMENT sur ce projet!');
        console.log('  → Le client n\'a pas encore défini les ressources');
      }
    } else {
      console.log('\n❌ Aucun projet contenant "New" ou "key" trouvé');
    }
  }

  // 2. Vérifier les assignments du candidat
  console.log('\n📊 TOUS les assignments du candidat Francis:');
  const { data: userAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (title, status),
      hr_profiles (name)
    `)
    .eq('candidate_id', userId);

  if (userAssignments && userAssignments.length > 0) {
    console.log(`  Total: ${userAssignments.length} assignment(s)`);
    userAssignments.forEach(a => {
      const projectTitle = a.projects?.title || 'N/A';
      const projectStatus = a.projects?.status || 'N/A';
      const profileName = a.hr_profiles?.name || 'NON DÉFINI';
      console.log(`  - Projet: "${projectTitle}" (status: ${projectStatus})`);
      console.log(`    Métier: ${profileName}, Booking: ${a.booking_status}`);
    });
  } else {
    console.log('  ❌ Le candidat n\'a AUCUN assignment');
  }

  // 3. Diagnostic final
  console.log('\n📝 DIAGNOSTIC FINAL:');
  if (!projects || projects.length === 0) {
    console.log('  ❌ La base est vide ou inaccessible');
  } else if (!userAssignments || userAssignments.length === 0) {
    console.log('  ❌ Le candidat Francis n\'est assigné à aucun projet');
    console.log('  → Il faut qu\'il accepte une mission ou qu\'un client l\'assigne');
  } else {
    console.log('  ✅ Des données existent');
    console.log('  → Vérifier les filtres dans le code frontend');
  }
}

diagnose().catch(console.error);