import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function checkWebhookSuccess() {
  const userId = '0d716d0a-739e-46d3-a593-dfb177a386c2';
  const email = 'fmeleard+webhook3_1757140917980@gmail.com';
  
  console.log('🔍 VÉRIFICATION FINALE DU WEBHOOK\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 ID: ${userId}\n`);

  // Se connecter avec l'utilisateur pour avoir accès aux tables
  console.log('Connexion avec l\'utilisateur test...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'TestWebhook123!'
  });

  if (authError && authError.message !== 'Email not confirmed') {
    console.log('⚠️  Email non confirmé (normal pour un test)\n');
  } else if (authData?.user) {
    console.log('✅ Connexion réussie\n');
  }

  console.log('📊 RECHERCHE DES PROFILS:\n');
  
  // Vérifier profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .or(`id.eq.${userId},email.eq.${email}`);

  if (profiles && profiles.length > 0) {
    console.log('✅ PROFIL TROUVÉ dans la table profiles:');
    const profile = profiles[0];
    console.log('   - ID:', profile.id);
    console.log('   - Email:', profile.email);
    console.log('   - Role:', profile.role);
    console.log('   - Prénom:', profile.first_name || '(vide)');
    console.log('   - Nom:', profile.last_name || '(vide)');
  } else {
    console.log('❌ Aucun profil dans la table profiles');
    if (profileError) console.log('   Erreur:', profileError.message);
  }

  console.log('');

  // Vérifier candidate_profiles
  const { data: candidates, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .or(`id.eq.${userId},email.eq.${email}`);

  if (candidates && candidates.length > 0) {
    console.log('✅ PROFIL CANDIDAT TROUVÉ:');
    const candidate = candidates[0];
    console.log('   - ID:', candidate.id);
    console.log('   - Email:', candidate.email);
    console.log('   - Status:', candidate.status);
    console.log('   - Qualification:', candidate.qualification_status);
    console.log('   - Seniority:', candidate.seniority);
  } else {
    console.log('❌ Aucun profil dans candidate_profiles');
    if (candidateError) console.log('   Erreur:', candidateError.message);
  }

  // Conclusion
  console.log('\n' + '='.repeat(60));
  if ((profiles && profiles.length > 0) && (candidates && candidates.length > 0)) {
    console.log('🎉 SUCCÈS TOTAL !');
    console.log('Le webhook fonctionne parfaitement.');
    console.log('Les deux profils ont été créés automatiquement.');
    console.log('\n✅ Tous les nouveaux utilisateurs auront maintenant');
    console.log('   leurs profils créés automatiquement !');
  } else if (profiles && profiles.length > 0) {
    console.log('⚠️  SUCCÈS PARTIEL');
    console.log('Le profil général a été créé mais pas le profil candidat.');
    console.log('Vérifiez les logs pour voir l\'erreur.');
  } else {
    console.log('❌ ÉCHEC');
    console.log('Les profils n\'ont pas été créés.');
    console.log('\nVérifiez les logs de la fonction Edge :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
    console.log('\nRecherchez l\'ID:', userId);
  }

  // Se déconnecter
  await supabase.auth.signOut();
  
  process.exit(0);
}

checkWebhookSuccess();