import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q'
);

async function checkProjectIA() {
  console.log('🔍 Recherche du projet "Projet new key"...\n');

  // 1. Trouver le projet
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, title, status, owner_id')
    .ilike('title', '%new key%');

  if (projectError) {
    console.error('❌ Erreur recherche projet:', projectError);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('❌ Aucun projet trouvé avec "new key" dans le titre');
    return;
  }

  for (const project of projects) {
    console.log('📋 Projet trouvé:', {
      id: project.id,
      title: project.title,
      status: project.status
    });

    // 2. Vérifier les ressources assignées
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        candidate_id,
        booking_status,
        hr_profiles (
          id,
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', project.id);

    if (assignError) {
      console.error('❌ Erreur récupération assignations:', assignError);
      continue;
    }

    console.log(`\n📊 Ressources assignées (${assignments?.length || 0}):`);

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        console.log('\n  Ressource:', {
          id: assignment.id,
          profile_id: assignment.profile_id,
          candidate_id: assignment.candidate_id,
          booking_status: assignment.booking_status,
          hr_profile: assignment.hr_profiles ? {
            name: assignment.hr_profiles.name,
            is_ai: assignment.hr_profiles.is_ai,
            prompt_id: assignment.hr_profiles.prompt_id
          } : 'Non trouvé'
        });

        // Si c'est une IA, vérifier si elle a un profil candidat
        if (assignment.hr_profiles?.is_ai) {
          console.log('    🤖 C\'est une IA !');

          // Vérifier si un profil candidat existe pour cette IA
          if (assignment.candidate_id) {
            const { data: candidateProfile } = await supabase
              .from('candidate_profiles')
              .select('id, first_name, last_name, email')
              .eq('id', assignment.candidate_id)
              .single();

            if (candidateProfile) {
              console.log('    ✅ Profil candidat IA trouvé:', candidateProfile);
            } else {
              console.log('    ❌ Pas de profil candidat pour cette IA');
            }

            // Vérifier aussi dans profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, first_name, email')
              .eq('id', assignment.candidate_id)
              .single();

            if (profile) {
              console.log('    ✅ Profil utilisateur trouvé:', profile);
            } else {
              console.log('    ❌ Pas de profil utilisateur pour cette IA');
            }
          } else {
            console.log('    ⚠️ Pas de candidate_id pour cette IA');
          }
        }
      }
    } else {
      console.log('  Aucune ressource assignée');
    }
  }

  // 3. Vérifier s'il existe des profils IA dans la base
  console.log('\n\n🤖 Vérification globale des ressources IA:');

  const { data: iaProfiles, error: iaError } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (iaProfiles && iaProfiles.length > 0) {
    console.log(`✅ ${iaProfiles.length} profil(s) IA trouvé(s):`);
    iaProfiles.forEach(ia => {
      console.log('  -', ia.name, '(ID:', ia.id, ')');
    });
  } else {
    console.log('❌ Aucun profil IA dans hr_profiles');
  }
}

checkProjectIA();