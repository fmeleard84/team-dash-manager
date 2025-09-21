import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkIAResources() {
  console.log('🤖 Recherche détaillée des ressources IA...\n');

  // 1. Chercher les profils avec "IA" dans le nom
  console.log('🔍 Recherche par nom contenant "IA"...');
  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select(`
      *,
      hr_categories (
        name
      )
    `)
    .ilike('name', '%IA%');

  console.log(`📊 Ressources avec "IA" dans le nom: ${iaProfiles?.length || 0}`);

  // Chercher aussi par noms spécifiques
  const { data: specificProfiles } = await supabase
    .from('hr_profiles')
    .select(`
      *,
      hr_categories (
        name
      )
    `)
    .or('name.ilike.%Rédacteur%,name.ilike.%Concepteur%');

  console.log(`📝 Ressources Rédacteur/Concepteur: ${specificProfiles?.length || 0}`);

  // Combiner les résultats uniques
  const allProfiles = [...(iaProfiles || []), ...(specificProfiles || [])];
  const uniqueProfiles = allProfiles.filter((profile, index, self) =>
    index === self.findIndex((p) => p.id === profile.id)
  );

  const iaProfilesFiltered = uniqueProfiles.filter(p =>
    p.name.includes('IA') || p.name.includes('Rédacteur IA') || p.name.includes('Concepteur')
  );

  if (iaProfilesFiltered.length === 0) {
    console.log('\n❌ Aucune ressource IA trouvée');
    return;
  }

  console.log(`\n✅ ${iaProfilesFiltered.length} ressource(s) IA trouvée(s):\n`);
  for (const profile of iaProfilesFiltered) {
    console.log(`🤖 ${profile.name}`);
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - Catégorie: ${profile.hr_categories?.name || 'N/D'}`);
    console.log(`   - is_ai: ${profile.is_ai}`);
    console.log(`   - Prix: ${profile.base_price}`);
    console.log('');
  }


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
    .in('profile_id', iaProfilesFiltered.map(p => p.id))
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

  for (const iaProfile of iaProfilesFiltered) {
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