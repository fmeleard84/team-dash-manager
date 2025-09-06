import { createClient } from '@supabase/supabase-js';

// Utiliser la clé anon pour la vérification
const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function checkWebhookResult() {
  console.log('🔍 VÉRIFICATION DU DERNIER UTILISATEUR CRÉÉ\n');
  
  const userId = '1c5dc1dd-f770-45bf-9001-3fccd98b3ba3';
  const email = 'fmeleard+webhook_1757140101973@gmail.com';
  
  console.log(`📧 Vérification pour l'utilisateur:`);
  console.log(`   - ID: ${userId}`);
  console.log(`   - Email: ${email}\n`);

  // Se connecter avec cet utilisateur pour avoir les permissions
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'TestWebhook123!'
  });

  if (signInError) {
    console.error('❌ Impossible de se connecter:', signInError.message);
    
    // Essayer quand même de vérifier sans authentification
    console.log('\nTentative de vérification sans authentification...\n');
  } else {
    console.log('✅ Connexion réussie\n');
  }

  // Vérifier les profils
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  const { data: candidateProfiles, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', email);

  console.log('📊 RÉSULTATS:\n');
  
  if (profiles && profiles.length > 0) {
    console.log('✅ PROFIL GÉNÉRAL TROUVÉ:');
    const profile = profiles[0];
    console.log('   - ID:', profile.id);
    console.log('   - Email:', profile.email);
    console.log('   - Role:', profile.role);
    console.log('   - Prénom:', profile.first_name || '(vide)');
    console.log('   - Nom:', profile.last_name || '(vide)');
  } else {
    console.log('❌ Aucun profil général trouvé');
    if (profilesError) console.log('   Erreur:', profilesError.message);
  }

  console.log('');
  
  if (candidateProfiles && candidateProfiles.length > 0) {
    console.log('✅ PROFIL CANDIDAT TROUVÉ:');
    const candidateProfile = candidateProfiles[0];
    console.log('   - ID:', candidateProfile.id);
    console.log('   - Email:', candidateProfile.email);
    console.log('   - Status:', candidateProfile.status);
    console.log('   - Qualification:', candidateProfile.qualification_status);
  } else {
    console.log('❌ Aucun profil candidat trouvé');
    if (candidateError) console.log('   Erreur:', candidateError.message);
  }

  // Vérifier aussi par ID
  console.log('\n🔍 Vérification par ID...\n');
  
  const { data: profileById } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .single();

  const { data: candidateById } = await supabase
    .from('candidate_profiles')
    .select('id, email, status')
    .eq('id', userId)
    .single();

  if (profileById) {
    console.log('✅ Profil trouvé par ID:', profileById.id);
  } else {
    console.log('❌ Pas de profil avec cet ID');
  }

  if (candidateById) {
    console.log('✅ Candidat trouvé par ID:', candidateById.id);
  } else {
    console.log('❌ Pas de candidat avec cet ID');
  }

  // Conclusion
  console.log('\n' + '='.repeat(50));
  if ((profiles && profiles.length > 0) || profileById) {
    console.log('🎉 LE WEBHOOK A FONCTIONNÉ !');
    console.log('Les profils ont été créés automatiquement.');
  } else {
    console.log('⚠️  LE WEBHOOK N\'A PAS FONCTIONNÉ');
    console.log('\nVérifiez les logs de la fonction Edge :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
    console.log('\nOu vérifiez la configuration du webhook :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/database/hooks');
  }

  // Se déconnecter
  if (signInData) {
    await supabase.auth.signOut();
  }
  
  process.exit(0);
}

checkWebhookResult();