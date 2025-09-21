import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function testIAMessagingFix() {
  console.log('🧪 TEST: Vérification de la correction IA pour la messagerie\n');

  try {
    // 1. Vérifier que le trigger existe
    console.log('1. 🔍 Vérification du trigger auto_accept_ia_bookings...');
    const { data: triggerCheck } = await supabase.rpc('test_ia_auto_accept');
    console.log('   Résultat:', triggerCheck || 'Fonction de test non disponible');

    // 2. Vérifier les ressources IA
    console.log('\n2. 🤖 Vérification des ressources IA...');
    const { data: iaProfiles } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .eq('is_ai', true);

    console.log(`   Ressources IA trouvées: ${iaProfiles?.length || 0}`);
    if (iaProfiles) {
      iaProfiles.forEach(ia => console.log(`   - ${ia.name} (ID: ${ia.id})`));
    }

    // 3. Vérifier les profils candidats pour les IA
    console.log('\n3. 👤 Vérification des profils candidats IA...');
    if (iaProfiles && iaProfiles.length > 0) {
      for (const ia of iaProfiles) {
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id, first_name, last_name, email, status')
          .eq('id', ia.id)
          .single();

        if (candidateProfile) {
          console.log(`   ✅ ${ia.name}: Profil candidat OK (${candidateProfile.email})`);
        } else {
          console.log(`   ❌ ${ia.name}: MANQUE le profil candidat`);
        }

        // Vérifier aussi dans profiles
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, email, first_name')
          .eq('id', ia.id)
          .single();

        if (userProfile) {
          console.log(`   ✅ ${ia.name}: Profil utilisateur OK`);
        } else {
          console.log(`   ❌ ${ia.name}: MANQUE le profil utilisateur`);
        }
      }
    }

    // 4. Vérifier les assignations avec candidate_id
    console.log('\n4. 📋 Vérification des assignations IA...');
    const { data: iaAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        candidate_id,
        booking_status,
        hr_profiles (
          name,
          is_ai
        )
      `)
      .not('hr_profiles.is_ai', 'is', null)
      .eq('hr_profiles.is_ai', true);

    console.log(`   Assignations IA trouvées: ${iaAssignments?.length || 0}`);
    if (iaAssignments) {
      iaAssignments.forEach(a => {
        const status = a.candidate_id ? '✅' : '❌';
        console.log(`   ${status} ${a.hr_profiles?.name}: candidate_id=${a.candidate_id || 'NULL'}, status=${a.booking_status}`);
      });
    }

    // 5. Simuler le hook useProjectMembersForMessaging pour un projet
    console.log('\n5. 💬 Test simulation hook messagerie...');

    // Trouver un projet avec des IA assignées
    if (iaAssignments && iaAssignments.length > 0) {
      const testProjectId = iaAssignments[0].project_id;
      console.log(`   Projet test: ${testProjectId}`);

      // Simuler la requête du hook
      const { data: mockHookData } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            name,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', testProjectId)
        .in('booking_status', ['accepted', 'completed']);

      console.log(`   Ressources trouvées par le hook: ${mockHookData?.length || 0}`);

      if (mockHookData) {
        for (const assignment of mockHookData) {
          if (assignment.hr_profiles?.is_ai) {
            const hasCandidate = !!assignment.candidate_id;
            console.log(`   🤖 ${assignment.hr_profiles.name}:`);
            console.log(`      - candidate_id: ${assignment.candidate_id || 'NULL'}`);
            console.log(`      - booking_status: ${assignment.booking_status}`);
            console.log(`      - Apparaîtra dans messagerie: ${hasCandidate ? '✅ OUI' : '❌ NON'}`);

            if (hasCandidate) {
              // Vérifier si le profil sera trouvé
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', assignment.candidate_id)
                .single();

              console.log(`      - Profil trouvé: ${profile ? '✅ OUI' : '❌ NON'}`);
            }
          }
        }
      }
    }

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

testIAMessagingFix();