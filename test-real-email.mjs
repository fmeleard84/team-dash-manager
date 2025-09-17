import { createClient } from '@supabase/supabase-js';

// Configuration de production avec HTTPS
const supabaseUrl = 'https://nlesrzepybeeghghjafc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealEmail() {
  console.log('🧪 Test d\'envoi d\'email réel via Brevo...\n');
  console.log('📍 URL Supabase:', supabaseUrl);
  console.log('🌐 Site accessible sur: https://vaya.rip');
  console.log('🔒 HTTPS configuré avec Let\'s Encrypt\n');

  const testEmail = 'fmeleard+test_mail@gmail.com';
  const testPassword = 'TestVaya123!';

  try {
    console.log('📧 Création du compte avec:', testEmail);

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://vaya.rip/auth/callback',
        data: {
          first_name: 'Francis',
          last_name: 'Test',
          role: 'client'
        }
      }
    });

    if (error) {
      console.error('❌ Erreur lors de la création:', error.message);

      // Si l'utilisateur existe déjà, essayer de se connecter
      if (error.message.includes('already registered')) {
        console.log('\n📝 L\'utilisateur existe déjà. Tentative de connexion...');

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });

        if (signInData?.user) {
          console.log('✅ Connexion réussie!');
          console.log('   ID:', signInData.user.id);
          console.log('   Email confirmé:', !!signInData.user.confirmed_at);
        } else if (signInError) {
          console.log('❌ Erreur de connexion:', signInError.message);
        }
      }
      return;
    }

    if (data.user) {
      console.log('\n✅ Compte créé avec succès!');
      console.log('   ID utilisateur:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Confirmation requise:', !data.user.confirmed_at);

      if (!data.user.confirmed_at) {
        console.log('\n📬 Email de confirmation envoyé via Brevo à:', testEmail);
        console.log('   Le lien pointera vers: https://vaya.rip');
        console.log('   Vérifiez votre boîte de réception Gmail');
        console.log('   (Vérifiez aussi les spams si nécessaire)');
      }
    }

    console.log('\n🎉 Test terminé avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Vérifiez votre email à:', testEmail);
    console.log('2. Cliquez sur le lien de confirmation');
    console.log('3. Vous serez redirigé vers https://vaya.rip');
    console.log('4. Connectez-vous avec le mot de passe:', testPassword);

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

testRealEmail();