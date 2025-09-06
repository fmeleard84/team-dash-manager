import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllCandidates() {
  console.log('\n🗑️  SUPPRESSION DE TOUS LES CANDIDATS...\n');

  try {
    // 1. Récupérer tous les utilisateurs candidats
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Erreur récupération utilisateurs:', authError);
      return;
    }

    const candidateUsers = authUsers.users.filter(user => 
      user.user_metadata?.role === 'candidate' || 
      user.email?.includes('candidate') ||
      user.email?.includes('ressource')
    );

    console.log(`📊 ${candidateUsers.length} candidats trouvés\n`);

    // 2. Supprimer les données associées dans l'ordre
    console.log('1. Suppression des associations langues/expertises...');
    await supabase.from('candidate_languages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('candidate_expertises').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('candidate_skills').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Associations supprimées');

    console.log('\n2. Suppression des notifications candidats...');
    await supabase.from('candidate_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Notifications supprimées');

    console.log('\n3. Suppression des affectations de projets...');
    await supabase.from('candidate_project_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Affectations supprimées');

    console.log('\n4. Suppression des résultats de qualification...');
    await supabase.from('candidate_qualification_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✅ Résultats de qualification supprimés');

    console.log('\n5. Suppression des profils candidats...');
    const { error: deleteProfilesError } = await supabase
      .from('candidate_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteProfilesError) {
      console.error('   ❌ Erreur suppression profils:', deleteProfilesError);
    } else {
      console.log('   ✅ Profils candidats supprimés');
    }

    console.log('\n6. Suppression des profils généraux des candidats...');
    for (const user of candidateUsers) {
      await supabase.from('profiles').delete().eq('id', user.id);
    }
    console.log('   ✅ Profils généraux supprimés');

    console.log('\n7. Suppression des comptes auth.users...');
    let deletedCount = 0;
    for (const user of candidateUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Erreur suppression ${user.email}:`, error.message);
      } else {
        console.log(`   ✅ ${user.email} supprimé`);
        deletedCount++;
      }
    }

    console.log(`\n✅ TERMINÉ: ${deletedCount}/${candidateUsers.length} candidats supprimés complètement`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }

  process.exit(0);
}

deleteAllCandidates();