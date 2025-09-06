import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function verifyWebhook() {
  console.log('🔍 VÉRIFICATION DU WEBHOOK\n');
  
  const timestamp = Date.now();
  const testEmail = `fmeleard+nouveau_webhook_${timestamp}@gmail.com`;
  console.log(`📧 Création d'un compte test: ${testEmail}`);
  console.log('   Mot de passe: TestWebhook123!\n');

  // 1. Créer un nouvel utilisateur via l'API publique (comme un vrai signup)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestWebhook123!',
    options: {
      data: {
        role: 'candidate',
        first_name: 'Test',
        last_name: 'Webhook',
        phone: '0600000000'
      }
    }
  });

  if (signUpError) {
    console.error('❌ Erreur lors de la création:', signUpError.message);
    return;
  }

  if (!signUpData.user) {
    console.error('❌ Pas d\'utilisateur créé');
    return;
  }

  const userId = signUpData.user.id;
  console.log(`✅ Utilisateur créé avec ID: ${userId}`);
  
  // 2. Attendre que le webhook se déclenche
  console.log('\n⏳ Attente du déclenchement du webhook (5 secondes)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 3. Vérifier avec la clé service_role
  const supabaseAdmin = createClient(
    'https://egdelmcijszuapcpglsy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0'
  );

  // 4. Vérifier que les profils ont été créés
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: candidateProfile, error: candidateError } = await supabaseAdmin
    .from('candidate_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('\n📊 RÉSULTATS DU TEST:\n');
  
  if (profile && !profileError) {
    console.log('✅ Table profiles:');
    console.log('   - ID:', profile.id);
    console.log('   - Email:', profile.email);
    console.log('   - Role:', profile.role);
    console.log('   - Prénom:', profile.first_name || '(vide)');
    console.log('   - Nom:', profile.last_name || '(vide)');
  } else {
    console.log('❌ Profil général NON créé');
    if (profileError) console.log('   Erreur:', profileError.message);
  }

  console.log('');
  
  if (candidateProfile && !candidateError) {
    console.log('✅ Table candidate_profiles:');
    console.log('   - ID:', candidateProfile.id);
    console.log('   - Email:', candidateProfile.email);
    console.log('   - Status:', candidateProfile.status);
    console.log('   - Qualification:', candidateProfile.qualification_status);
    console.log('   - Seniority:', candidateProfile.seniority);
  } else {
    console.log('❌ Profil candidat NON créé');
    if (candidateError) console.log('   Erreur:', candidateError.message);
  }

  // 5. Conclusion
  console.log('\n' + '='.repeat(50));
  if (profile && candidateProfile) {
    console.log('🎉 WEBHOOK FONCTIONNEL !');
    console.log('Les nouveaux utilisateurs auront leurs profils créés automatiquement.');
  } else {
    console.log('⚠️  LE WEBHOOK NE FONCTIONNE PAS CORRECTEMENT');
    console.log('\nVérifiez dans le dashboard Supabase :');
    console.log('1. Que le webhook est bien activé');
    console.log('2. Que l\'URL est correcte');
    console.log('3. Que l\'Authorization header est correct');
    console.log('\nVous pouvez aussi vérifier les logs de la fonction :');
    console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
  }

  // 6. Nettoyer (optionnel - supprimer l'utilisateur test)
  console.log('\n🧹 Note: L\'utilisateur test reste dans la base pour vérification manuelle.');
  console.log(`   Email: ${testEmail}`);
  
  process.exit(0);
}

verifyWebhook();