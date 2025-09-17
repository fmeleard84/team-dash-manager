import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlesrzepybeeghhgjafc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkxNzMxNywiZXhwIjoyMDczNDkzMzE3fQ.PGK4EhHjhMc9lkONw_QiSaPL_8pKvXZZjeY6rkTPc4Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Initialisation de la base de données de production...\n');

async function initDatabase() {
  try {
    // 1. Créer les tables essentielles si elles n'existent pas
    console.log('📊 Création des tables essentielles...');

    // Test simple de connexion d'abord
    console.log('Test de connexion à Supabase...');
    const { data: testData, error: testError } = await supabase.auth.getSession();

    if (!testError || testError.message === 'Auth session missing!') {
      console.log('✅ Connexion établie avec succès');
      console.log('URL Supabase:', supabaseUrl);
    } else {
      console.error('❌ Erreur de connexion:', testError);
      return;
    }

    // 2. Vérifier si les tables existent
    console.log('\n🔍 Vérification des tables...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (profileError) {
      if (profileError.message.includes('relation "public.profiles" does not exist')) {
        console.log('⚠️ Les tables n\'existent pas encore');
        console.log('📋 Vous devez importer le schéma depuis votre base de développement');
      } else {
        console.error('❌ Erreur:', profileError.message);
      }
    } else {
      console.log('✅ Table profiles détectée');
    }

    console.log('\n✅ Base de données de production initialisée avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Créer le webhook dans Supabase Dashboard:');
    console.log('   - Name: handle_new_user_simple');
    console.log('   - Table: auth.users');
    console.log('   - Events: INSERT');
    console.log('   - Type: HTTP Request');
    console.log('   - URL: https://nlesrzepybeeghhgjafc.supabase.co/functions/v1/handle-new-user-simple');
    console.log('\n2. Copier le schéma complet depuis DEV si nécessaire');
    console.log('\n3. Lancer: /opt/team-dash-manager/deploy.sh prod');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

initDatabase();