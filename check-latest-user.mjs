import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function checkLatestUser() {
  const userId = '20991b2c-b431-4349-b05c-ede3976d4430';
  const email = 'fmeleard+webhook2_1757140449294@gmail.com';
  
  console.log('🔍 VÉRIFICATION DU DERNIER UTILISATEUR CRÉÉ\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 ID: ${userId}\n`);

  // Se connecter avec cet utilisateur pour avoir ses permissions
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'TestWebhook123!'
  });

  if (signInError && signInError.message !== 'Email not confirmed') {
    console.error('❌ Erreur connexion:', signInError.message);
  }

  // Essayer de récupérer les profils même sans être connecté
  // (certaines tables peuvent avoir des politiques RLS permettant la lecture publique)
  
  console.log('📊 VÉRIFICATION DES PROFILS:\n');
  
  // Méthode 1: Chercher par email
  const { data: profilesByEmail, error: error1 } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  if (profilesByEmail && profilesByEmail.length > 0) {
    console.log('✅ PROFIL TROUVÉ (par email) dans profiles:');
    console.log('   - ID:', profilesByEmail[0].id);
    console.log('   - Role:', profilesByEmail[0].role);
  } else if (error1) {
    console.log('❌ Erreur recherche par email dans profiles:', error1.message);
  } else {
    console.log('❌ Aucun profil trouvé par email dans profiles');
  }

  // Méthode 2: Chercher par ID
  const { data: profileById, error: error2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);

  if (profileById && profileById.length > 0) {
    console.log('✅ PROFIL TROUVÉ (par ID) dans profiles:');
    console.log('   - Email:', profileById[0].email);
    console.log('   - Role:', profileById[0].role);
  } else if (error2) {
    console.log('❌ Erreur recherche par ID dans profiles:', error2.message);
  } else {
    console.log('❌ Aucun profil trouvé par ID dans profiles');
  }

  console.log('');

  // Vérifier candidate_profiles
  const { data: candidateByEmail, error: error3 } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', email);

  if (candidateByEmail && candidateByEmail.length > 0) {
    console.log('✅ CANDIDAT TROUVÉ (par email):');
    console.log('   - Status:', candidateByEmail[0].status);
    console.log('   - Qualification:', candidateByEmail[0].qualification_status);
  } else if (error3) {
    console.log('❌ Erreur recherche dans candidate_profiles:', error3.message);
  } else {
    console.log('❌ Aucun candidat trouvé dans candidate_profiles');
  }

  const { data: candidateById, error: error4 } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', userId);

  if (candidateById && candidateById.length > 0) {
    console.log('✅ CANDIDAT TROUVÉ (par ID):');
    console.log('   - Email:', candidateById[0].email);
    console.log('   - Status:', candidateById[0].status);
  } else if (error4) {
    console.log('❌ Erreur recherche par ID dans candidate_profiles:', error4.message);
  } else {
    console.log('❌ Aucun candidat trouvé par ID dans candidate_profiles');
  }

  // Conclusion
  console.log('\n' + '='.repeat(50));
  if ((profilesByEmail && profilesByEmail.length > 0) || (profileById && profileById.length > 0)) {
    console.log('🎉 LE WEBHOOK A FONCTIONNÉ !');
    console.log('Les profils ont été créés.');
  } else {
    console.log('⚠️  LE WEBHOOK N\'A PAS CRÉÉ LES PROFILS');
    console.log('\nVérifiez les logs de la fonction pour voir l\'erreur :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
  }
  
  process.exit(0);
}

checkLatestUser();