import { createClient } from '@supabase/supabase-js';

// Configuration de production
const supabaseUrl = 'https://nlesrzepybeeghghjafc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealSignup() {
  console.log('🧪 Test d\'inscription réelle via l\'interface publique...\n');

  const timestamp = Date.now();
  const testEmail = `fmeleard+prod_${timestamp}@gmail.com`;
  const testPassword = 'VayaProd123!';

  try {
    console.log('📧 Création du compte avec:', testEmail);
    console.log('🔗 Redirect configuré: https://vaya.rip/auth/callback\n');

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://vaya.rip/auth/callback',
        data: {
          first_name: 'Test',
          last_name: 'Production',
          role: 'client'
        }
      }
    });

    if (error) {
      console.error('❌ Erreur:', error.message);

      if (error.message.includes('already registered')) {
        console.log('\n📝 Email déjà utilisé. Essayez avec un autre timestamp.');
      }
      return;
    }

    if (data?.user) {
      console.log('✅ Inscription réussie!');
      console.log('   ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Confirmé:', !!data.user.confirmed_at);

      if (!data.user.confirmed_at) {
        console.log('\n📬 Email de confirmation envoyé!');
        console.log('   Destinataire:', testEmail);
        console.log('   Mot de passe:', testPassword);
        console.log('\n⚠️  IMPORTANT:');
        console.log('   1. Vérifiez l\'expéditeur de l\'email');
        console.log('      - Si noreply@mail.app.supabase.io → SMTP Brevo pas activé');
        console.log('      - Si noreply@vaya.rip → Brevo activé ✅');
        console.log('   2. Vérifiez le lien dans l\'email');
        console.log('      - Si http://95.216.204.226:8081 → Mauvaise config');
        console.log('      - Si https://vaya.rip → Bonne config ✅');

        console.log('\n📋 Actions dans le Dashboard Supabase:');
        console.log('   1. Authentication → Email Templates → SMTP Settings');
        console.log('   2. Cocher "Enable Custom SMTP"');
        console.log('   3. Configurer les paramètres Brevo');
        console.log('   4. Authentication → URL Configuration');
        console.log('   5. Site URL: https://vaya.rip');
        console.log('   6. Sauvegarder et attendre 2 minutes');
      }
    }

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

testRealSignup();