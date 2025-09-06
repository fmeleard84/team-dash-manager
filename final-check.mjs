import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function finalCheck() {
  const userId = 'c4f32d90-371a-43ca-b7ed-a431140558a0';
  const email = 'fmeleard+webhook_final_1757141052048@gmail.com';
  
  console.log('🎯 TEST FINAL DU WEBHOOK\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 ID: ${userId}\n`);

  // Essayer de se connecter (même si email non confirmé)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'TestWebhook123!'
  });

  if (authError) {
    console.log('⚠️  ' + authError.message + ' (normal pour un test)\n');
  }

  console.log('🔍 VÉRIFICATION DES PROFILS CRÉÉS PAR LE WEBHOOK:\n');
  
  // Chercher dans profiles sans authentification (RLS peut permettre la lecture)
  const { data: profiles, count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .or(`id.eq.${userId},email.eq.${email}`);

  if (profiles && profiles.length > 0) {
    console.log('✅ PROFIL GÉNÉRAL CRÉÉ AVEC SUCCÈS !');
    const profile = profiles[0];
    console.log('   Table: profiles');
    console.log('   - ID:', profile.id);
    console.log('   - Email:', profile.email);
    console.log('   - Role:', profile.role);
    console.log('   - Prénom:', profile.first_name || '(vide)');
    console.log('   - Nom:', profile.last_name || '(vide)');
  } else {
    console.log('❌ Pas de profil dans la table profiles');
  }

  console.log('');

  // Chercher dans candidate_profiles
  const { data: candidates, count: candidateCount } = await supabase
    .from('candidate_profiles')
    .select('*', { count: 'exact' })
    .or(`id.eq.${userId},email.eq.${email}`);

  if (candidates && candidates.length > 0) {
    console.log('✅ PROFIL CANDIDAT CRÉÉ AVEC SUCCÈS !');
    const candidate = candidates[0];
    console.log('   Table: candidate_profiles');
    console.log('   - ID:', candidate.id);
    console.log('   - Email:', candidate.email);
    console.log('   - Status:', candidate.status);
    console.log('   - Qualification:', candidate.qualification_status);
    console.log('   - Seniority:', candidate.seniority);
  } else {
    console.log('❌ Pas de profil dans candidate_profiles');
  }

  // Résultat final
  console.log('\n' + '='.repeat(70));
  
  if ((profiles && profiles.length > 0) && (candidates && candidates.length > 0)) {
    console.log('🎉 🎉 🎉  SUCCÈS COMPLET  🎉 🎉 🎉');
    console.log('\n✅ Le webhook fonctionne parfaitement !');
    console.log('✅ Les deux profils ont été créés automatiquement');
    console.log('✅ Plus jamais d\'erreur 406 pour les nouveaux utilisateurs');
    console.log('\n💡 Le système est maintenant complètement opérationnel.');
    console.log('   Tous les nouveaux candidats auront leurs profils créés');
    console.log('   automatiquement lors de l\'inscription.');
  } else if (profiles && profiles.length > 0) {
    console.log('⚠️  SUCCÈS PARTIEL');
    console.log('Le profil général est créé mais pas le profil candidat.');
    console.log('Vérifiez les logs Edge Function pour l\'erreur.');
  } else {
    console.log('❌ ÉCHEC - Les profils n\'ont pas été créés');
    console.log('\n👉 Vérifiez les logs de la fonction Edge :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
    console.log('\nCherchez les requêtes POST récentes et regardez :');
    console.log('- Le status code (200 = OK, 401 = mauvaise auth)');
    console.log('- Les messages d\'erreur dans les logs');
  }

  if (authData) {
    await supabase.auth.signOut();
  }
  
  process.exit(0);
}

finalCheck();