import { createClient } from '@supabase/supabase-js';

// Configuration de production
const supabaseUrl = 'https://nlesrzepybeeghghjafc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  console.log('🧪 Test de création de compte en production...\n');
  console.log('📍 URL Supabase:', supabaseUrl);
  console.log('🌐 URL de callback attendue: http://95.216.204.226:3000/auth/callback\n');

  // Email de test avec timestamp pour unicité
  const timestamp = Date.now();
  const testEmail = `test.prod.${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('📧 Création du compte avec:', testEmail);

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://95.216.204.226:3000/auth/callback',
        data: {
          first_name: 'Test',
          last_name: 'Production',
          role: 'client'
        }
      }
    });

    if (error) {
      console.error('❌ Erreur lors de la création:', error.message);
      return;
    }

    if (data.user) {
      console.log('✅ Compte créé avec succès!');
      console.log('   ID utilisateur:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Confirmation requise:', !data.user.confirmed_at);

      if (!data.user.confirmed_at) {
        console.log('\n📬 Un email de confirmation a été envoyé via Brevo');
        console.log('   Vérifiez la boîte de réception de:', testEmail);
        console.log('   Le lien devrait pointer vers: http://95.216.204.226:3000');
      }

      // Vérifier si le profil a été créé automatiquement
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        console.log('\n✅ Profil créé automatiquement:', profile);
      } else if (profileError) {
        console.log('\n⚠️  Profil non créé:', profileError.message);
        console.log('   Vérifiez que le webhook handle_new_user_simple est configuré');
      }
    }

    // Tester aussi la configuration des URLs
    console.log('\n🔍 Test de l\'URL de callback...');
    const response = await fetch('http://95.216.204.226:3000/auth/callback', {
      method: 'GET',
      headers: {
        'User-Agent': 'Team-Dash-Test'
      }
    });

    if (response.ok || response.status === 200 || response.status === 302) {
      console.log('✅ L\'URL de callback est accessible');
    } else {
      console.log('⚠️  Status de l\'URL de callback:', response.status);
    }

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }

  console.log('\n📝 Prochaines étapes:');
  console.log('1. Vérifiez les logs Brevo pour l\'envoi');
  console.log('2. Vérifiez que l\'email contient le bon lien (port 3000)');
  console.log('3. Cliquez sur le lien pour confirmer');
}

testSignup();