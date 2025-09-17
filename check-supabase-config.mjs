import { createClient } from '@supabase/supabase-js';

// Configuration de production
const supabaseUrl = 'https://nlesrzepybeeghghjafc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkxNzMxNywiZXhwIjoyMDczNDkzMzE3fQ.PGK4EhHjhMc9lkONw_QiSaPL_8pKvXZZjeY6rkTPc4Y';

async function checkConfiguration() {
  console.log('🔍 Vérification de la configuration Supabase Production...\n');
  console.log('📍 Project: nlesrzepybeeghghjafc');
  console.log('🌐 URL: https://nlesrzepybeeghghjafc.supabase.co\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Tester la création d'un compte avec email de test
    const testEmail = `test_${Date.now()}@example.com`;
    console.log('📧 Test de création de compte avec:', testEmail);

    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'Test123456!',
      email_confirm: false,
      user_metadata: {
        test_account: true,
        created_at: new Date().toISOString()
      }
    });

    if (signUpError) {
      console.error('❌ Erreur lors de la création:', signUpError);
    } else if (signUpData?.user) {
      console.log('✅ Compte test créé avec succès');
      console.log('   ID:', signUpData.user.id);
      console.log('   Email:', signUpData.user.email);

      // Générer le lien de confirmation
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: testEmail,
        options: {
          redirectTo: 'https://vaya.rip/auth/callback'
        }
      });

      if (linkData?.properties?.action_link) {
        console.log('\n🔗 Lien de confirmation généré:');
        const url = new URL(linkData.properties.action_link);
        console.log('   Host:', url.host);
        console.log('   Redirect:', url.searchParams.get('redirect_to'));

        // Vérifier si le lien utilise l'IP ou le domaine
        if (url.host.includes('95.216.204.226')) {
          console.log('\n⚠️  PROBLÈME: Le lien utilise toujours l\'IP au lieu de vaya.rip');
          console.log('   Configuration Site URL non appliquée correctement');
        } else if (url.host.includes('vaya.rip')) {
          console.log('\n✅ OK: Le lien utilise bien vaya.rip');
        }

        // Vérifier le redirect_to
        const redirectTo = url.searchParams.get('redirect_to');
        if (redirectTo && redirectTo.includes('8081')) {
          console.log('⚠️  PROBLÈME: Redirection vers port 8081 détectée');
        } else if (redirectTo && redirectTo.includes('vaya.rip')) {
          console.log('✅ OK: Redirection vers vaya.rip configurée');
        }
      }

      // Nettoyer - supprimer le compte test
      console.log('\n🧹 Nettoyage du compte test...');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(signUpData.user.id);
      if (!deleteError) {
        console.log('✅ Compte test supprimé');
      }
    }

    // 2. Vérifier les métadonnées du projet
    console.log('\n📊 Informations du projet:');
    console.log('   URL publique: ' + supabaseUrl);
    console.log('   Dashboard: https://supabase.com/dashboard/project/nlesrzepybeeghghjafc');

    console.log('\n💡 Solutions possibles:');
    console.log('1. Vider le cache du navigateur et rafraîchir le dashboard');
    console.log('2. Vérifier dans Authentication → URL Configuration');
    console.log('3. S\'assurer que Site URL = https://vaya.rip (sans port)');
    console.log('4. Ajouter dans Redirect URLs:');
    console.log('   - https://vaya.rip');
    console.log('   - https://vaya.rip/auth/callback');
    console.log('   - https://vaya.rip/#/auth/callback');
    console.log('5. Sauvegarder et attendre 1-2 minutes pour la propagation');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkConfiguration();