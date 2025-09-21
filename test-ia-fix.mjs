import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testIAFix() {
  console.log('🔧 Test de la correction des ressources IA\n');
  console.log('=' .repeat(50));

  // 1. Chercher les ressources IA dans hr_profiles
  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (!iaProfiles || iaProfiles.length === 0) {
    console.log('❌ Aucune ressource IA trouvée dans hr_profiles');
    return;
  }

  console.log(`\n✅ ${iaProfiles.length} ressource(s) IA trouvée(s):`);

  for (const iaProfile of iaProfiles) {
    console.log(`\n📊 ${iaProfile.name} (ID: ${iaProfile.id})`);

    // Vérifier le profil candidat
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('id, email, status')
      .eq('id', iaProfile.id)
      .single();

    if (!candidateProfile) {
      console.log('   ❌ Pas de profil candidat');
      continue;
    }

    console.log(`   ✅ Profil candidat: ${candidateProfile.email}`);

    // Vérifier les assignations
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        candidate_id,
        booking_status,
        projects (
          title,
          status
        )
      `)
      .eq('profile_id', iaProfile.id);

    if (!assignments || assignments.length === 0) {
      console.log('   ⚠️  Aucune assignation trouvée');
      continue;
    }

    console.log(`   📌 ${assignments.length} assignation(s):`);

    for (const assignment of assignments) {
      const projectTitle = assignment.projects?.title || 'N/A';
      const projectStatus = assignment.projects?.status || 'N/A';

      console.log(`\n      Projet: "${projectTitle}" (${projectStatus})`);
      console.log(`      - booking_status: ${assignment.booking_status}`);
      console.log(`      - candidate_id: ${assignment.candidate_id || 'NULL'}`);

      // Vérification des critères pour apparaître dans la messagerie
      const isCorrect =
        assignment.booking_status === 'accepted' &&
        assignment.candidate_id === iaProfile.id;

      if (isCorrect) {
        console.log(`      ✅ Configuration CORRECTE - devrait apparaître dans la messagerie`);
      } else {
        console.log(`      ❌ Configuration INCORRECTE`);

        if (assignment.booking_status !== 'accepted') {
          console.log(`         - booking_status devrait être 'accepted' (actuellement: ${assignment.booking_status})`);
        }

        if (!assignment.candidate_id) {
          console.log(`         - candidate_id est NULL (devrait être ${iaProfile.id})`);
        } else if (assignment.candidate_id !== iaProfile.id) {
          console.log(`         - candidate_id incorrect (devrait être ${iaProfile.id})`);
        }
      }
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n💡 SOLUTION APPLIQUÉE:');
  console.log('1. ✅ booking_status des IA changé de "booké" à "accepted"');
  console.log('2. ✅ candidate_id défini à profile_id pour les ressources IA');
  console.log('3. 🎯 Les nouvelles ressources IA créées auront automatiquement:');
  console.log('   - booking_status = "accepted"');
  console.log('   - candidate_id = profile_id');
  console.log('\n⚠️  Les ressources IA existantes doivent être re-sauvegardées dans le projet');
  console.log('   pour appliquer les corrections.');
}

testIAFix().catch(console.error);