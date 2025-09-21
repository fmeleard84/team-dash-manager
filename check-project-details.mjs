import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkProjectDetails() {
  console.log('🔍 Recherche détaillée des projets...\n');

  // 1. Chercher TOUS les projets pour avoir une vue d'ensemble
  const { data: allProjects, error: allError } = await supabase
    .from('projects')
    .select('id, title, status, owner_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allError) {
    console.error('❌ Erreur récupération projets:', allError);
    return;
  }

  console.log(`📋 ${allProjects?.length || 0} projets trouvés:\n`);

  if (allProjects) {
    for (const project of allProjects) {
      console.log(`\n===== PROJET: ${project.title} =====`);
      console.log('ID:', project.id);
      console.log('Status:', project.status);
      console.log('Owner:', project.owner_id);

      // 2. Récupérer les ressources assignées EXACTEMENT comme dans le hook
      const { data: assignments, error: assignError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            id,
            name,
            is_ai,
            prompt_id
          ),
          candidate_profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', project.id);

      if (assignError) {
        console.error('❌ Erreur récupération assignations:', assignError);
        continue;
      }

      console.log(`\n📊 Ressources assignées: ${assignments?.length || 0}`);

      if (assignments && assignments.length > 0) {
        for (const assignment of assignments) {
          console.log('\n  📌 Ressource:');
          console.log('    - Profile:', assignment.hr_profiles?.name || 'Non trouvé');
          console.log('    - Is AI:', assignment.hr_profiles?.is_ai || false);
          console.log('    - Booking Status:', assignment.booking_status);
          console.log('    - Candidate ID:', assignment.candidate_id);

          if (assignment.hr_profiles?.is_ai) {
            console.log('    🤖 **C\'EST UNE IA!**');
            console.log('    - Prompt ID:', assignment.hr_profiles.prompt_id);
          }

          if (assignment.candidate_profiles) {
            console.log('    - Candidat:', assignment.candidate_profiles.first_name, assignment.candidate_profiles.last_name);
            console.log('    - Email:', assignment.candidate_profiles.email);
          } else {
            console.log('    - Candidat: NON TROUVÉ');
          }
        }
      }
    }
  }

  // 3. Vérifier spécifiquement les ressources IA
  console.log('\n\n======== RESSOURCES IA GLOBALES ========');
  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (iaProfiles && iaProfiles.length > 0) {
    console.log(`✅ ${iaProfiles.length} profil(s) IA trouvé(s):`);
    for (const ia of iaProfiles) {
      console.log(`  🤖 ${ia.name} (ID: ${ia.id})`);

      // Vérifier si cette IA est assignée à des projets
      const { data: iaAssignments } = await supabase
        .from('hr_resource_assignments')
        .select('project_id, booking_status, candidate_id')
        .eq('profile_id', ia.id);

      if (iaAssignments && iaAssignments.length > 0) {
        console.log(`     Assignée à ${iaAssignments.length} projet(s)`);
        iaAssignments.forEach(a => {
          console.log(`     - Projet: ${a.project_id}, Status: ${a.booking_status}, Candidate: ${a.candidate_id}`);
        });
      }
    }
  } else {
    console.log('❌ Aucun profil IA dans hr_profiles');
  }

  // 4. Vérifier les profils des users
  console.log('\n\n======== PROFILES USERS ========');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .limit(5);

  if (profiles) {
    console.log(`${profiles.length} profils users:`);
    profiles.forEach(p => {
      console.log(`  - ${p.first_name || 'Sans nom'} (${p.email})`);
    });
  }
}

checkProjectDetails();