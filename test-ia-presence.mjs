import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkIAResources() {
  console.log('🤖 Vérification des ressources IA dans les projets...\n');

  // 1. Chercher les profils IA
  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (!iaProfiles || iaProfiles.length === 0) {
    console.log('❌ Aucun profil IA trouvé dans hr_profiles');
    return;
  }

  console.log(`✅ ${iaProfiles.length} profils IA trouvés:`);
  iaProfiles.forEach(p => {
    console.log(`  - ${p.name} (ID: ${p.id}, prompt_id: ${p.prompt_id || 'N/A'})`);
  });

  // 2. Chercher les projets avec des ressources IA assignées
  console.log('\n📊 Projets avec ressources IA:');

  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        title,
        status
      ),
      hr_profiles (
        name,
        is_ai,
        prompt_id
      ),
      candidate_profiles (
        first_name,
        last_name,
        email
      )
    `)
    .in('profile_id', iaProfiles.map(p => p.id))
    .eq('booking_status', 'accepted');

  if (!assignments || assignments.length === 0) {
    console.log('  Aucun projet avec IA trouvé');
    return;
  }

  const projectsWithIA = {};
  assignments.forEach(a => {
    const projectTitle = a.projects?.title || 'N/A';
    if (!projectsWithIA[projectTitle]) {
      projectsWithIA[projectTitle] = [];
    }
    projectsWithIA[projectTitle].push({
      ia: a.hr_profiles?.name,
      status: a.booking_status,
      candidateId: a.candidate_id
    });
  });

  Object.entries(projectsWithIA).forEach(([project, ias]) => {
    console.log(`\n  Projet: "${project}"`);
    ias.forEach(ia => {
      console.log(`    - ${ia.ia} (booking: ${ia.status}, candidate_id: ${ia.candidateId || 'NULL'})`);
    });
  });

  // 3. Vérifier les profils candidats pour les IA
  console.log('\n🔍 Vérification des profils candidats pour IA:');

  for (const iaProfile of iaProfiles) {
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', iaProfile.id)
      .single();

    if (candidateProfile) {
      console.log(`  ✅ ${iaProfile.name}: profil candidat existe`);
      console.log(`     Email: ${candidateProfile.email}`);
      console.log(`     Status: ${candidateProfile.status}`);
    } else {
      console.log(`  ❌ ${iaProfile.name}: PAS de profil candidat`);
    }
  }

  // 4. Test spécifique pour "Projet New key"
  console.log('\n🔎 Recherche spécifique "Projet New key":');

  const { data: newKeyProject } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%new%key%')
    .single();

  if (newKeyProject) {
    console.log(`  Projet trouvé: "${newKeyProject.title}" (ID: ${newKeyProject.id})`);

    const { data: projectAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', newKeyProject.id);

    if (projectAssignments && projectAssignments.length > 0) {
      console.log(`  Ressources assignées:`);
      projectAssignments.forEach(a => {
        const isAI = a.hr_profiles?.is_ai ? '🤖 IA' : '👤 Humain';
        console.log(`    - ${a.hr_profiles?.name} ${isAI} (booking: ${a.booking_status})`);
      });
    }
  }
}

checkIAResources().catch(console.error);