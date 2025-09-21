import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function createTestIAProject() {
  console.log('🚀 Création d\'un projet test avec IA pour vérifier la messagerie\n');

  try {
    // 1. Créer une catégorie IA si elle n'existe pas
    let { data: iaCategory } = await supabase
      .from('hr_categories')
      .select('*')
      .ilike('name', '%intelligence%')
      .single();

    if (!iaCategory) {
      const { data: newCategory, error: categoryError } = await supabase
        .from('hr_categories')
        .insert({ name: 'Intelligence Artificielle' })
        .select()
        .single();

      if (categoryError) {
        console.error('❌ Erreur création catégorie:', categoryError);
        return;
      }
      iaCategory = newCategory;
      console.log('✅ Catégorie IA créée:', iaCategory.name);
    } else {
      console.log('✅ Catégorie IA trouvée:', iaCategory.name);
    }

    // 2. Créer une ressource IA
    const { data: iaProfile, error: iaError } = await supabase
      .from('hr_profiles')
      .insert({
        name: 'IA Rédacteur Test',
        category_id: iaCategory.id,
        base_price: 450,
        is_ai: true
      })
      .select()
      .single();

    if (iaError && !iaError.message.includes('duplicate')) {
      console.error('❌ Erreur création IA:', iaError);
      return;
    }
    console.log('✅ Ressource IA créée:', iaProfile?.name || 'Existait déjà');

    // Récupérer l'IA (créée ou existante)
    const { data: existingIA } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('name', 'IA Rédacteur Test')
      .single();

    if (!existingIA) {
      console.error('❌ Impossible de récupérer la ressource IA');
      return;
    }

    console.log('🤖 ID de l\'IA:', existingIA.id);

    // 3. Créer le profil utilisateur pour l'IA
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .insert({
        id: existingIA.id,
        email: 'ia_redacteur_test@ia.team',
        first_name: 'IA',
        role: 'candidate'
      })
      .select()
      .single();

    if (userError && !userError.message.includes('duplicate')) {
      console.error('❌ Erreur création profil utilisateur:', userError);
    } else {
      console.log('✅ Profil utilisateur IA créé');
    }

    // 4. Créer le profil candidat pour l'IA
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: existingIA.id,
        first_name: 'IA',
        last_name: 'Rédacteur Test',
        email: 'ia_redacteur_test@ia.team',
        position: 'IA Rédacteur Test',
        seniority: 'expert',
        status: 'disponible',
        profile_id: existingIA.id,
        daily_rate: 450,
        is_email_verified: true
      })
      .select()
      .single();

    if (candidateError && !candidateError.message.includes('duplicate')) {
      console.error('❌ Erreur création profil candidat:', candidateError);
    } else {
      console.log('✅ Profil candidat IA créé');
    }

    // 5. Trouver un client existant pour créer le projet
    const { data: clients } = await supabase
      .from('client_profiles')
      .select('id')
      .limit(1);

    if (!clients || clients.length === 0) {
      console.error('❌ Aucun client trouvé pour créer le projet');
      return;
    }

    const clientId = clients[0].id;
    console.log('👤 Client trouvé:', clientId);

    // 6. Créer un projet test
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: 'Projet Test IA Messagerie',
        description: 'Projet de test pour vérifier que les IA apparaissent dans la messagerie',
        status: 'pause',
        owner_id: clientId
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Erreur création projet:', projectError);
      return;
    }

    console.log('✅ Projet créé:', project.title, '(ID:', project.id + ')');

    // 7. Assigner l'IA au projet et TESTER LE TRIGGER
    console.log('\n🧪 TEST DU TRIGGER AUTO-ACCEPT...');

    const { data: assignment, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .insert({
        project_id: project.id,
        profile_id: existingIA.id,
        seniority: 'expert',
        booking_status: 'draft'  // Commencer par draft
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('❌ Erreur création assignation:', assignmentError);
      return;
    }

    console.log('✅ Assignation créée avec status draft');

    // 8. DÉCLENCHER LE TRIGGER en passant à 'recherche'
    console.log('🔥 Déclenchement du trigger: passage à recherche...');

    const { data: updatedAssignment, error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'recherche' })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur update assignation:', updateError);
      return;
    }

    console.log('📊 Résultat après trigger:');
    console.log('   - booking_status:', updatedAssignment.booking_status);
    console.log('   - candidate_id:', updatedAssignment.candidate_id || 'NULL');

    // 9. Vérifier le résultat attendu
    if (updatedAssignment.booking_status === 'accepted' && updatedAssignment.candidate_id === existingIA.id) {
      console.log('🎉 ✅ TRIGGER FONCTIONNE ! L\'IA a été auto-acceptée !');
    } else {
      console.log('❌ TRIGGER NE FONCTIONNE PAS. État actuel:');
      console.log('   - Attendu: booking_status=accepted, candidate_id=' + existingIA.id);
      console.log('   - Obtenu: booking_status=' + updatedAssignment.booking_status + ', candidate_id=' + (updatedAssignment.candidate_id || 'NULL'));
    }

    // 10. Test final: simuler le hook de messagerie
    console.log('\n💬 TEST HOOK MESSAGERIE...');

    const { data: messagingMembers } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', project.id)
      .in('booking_status', ['accepted', 'completed']);

    console.log('Membres trouvés pour la messagerie:', messagingMembers?.length || 0);

    if (messagingMembers && messagingMembers.length > 0) {
      for (const member of messagingMembers) {
        if (member.hr_profiles?.is_ai && member.candidate_id) {
          console.log('🤖 IA trouvée dans messagerie:', member.hr_profiles.name);
          console.log('   - candidate_id:', member.candidate_id);
          console.log('   - booking_status:', member.booking_status);

          // Vérifier si le profil sera trouvé par le hook
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', member.candidate_id)
            .single();

          console.log('   - Profil accessible:', profile ? '✅ OUI' : '❌ NON');

          if (profile) {
            console.log('🎉 L\'IA apparaîtra dans la barre gauche de la messagerie !');
          }
        }
      }
    }

    console.log('\n📋 RÉSUMÉ:');
    console.log('- Projet créé:', project.title);
    console.log('- IA assignée:', existingIA.name);
    console.log('- Trigger testé:', updatedAssignment.booking_status === 'accepted' ? '✅' : '❌');
    console.log('- Messagerie OK:', messagingMembers?.length > 0 ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
}

createTestIAProject();