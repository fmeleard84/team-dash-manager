import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0'
);

async function testWebhook() {
  console.log('🧪 TEST DU WEBHOOK\n');

  // 1. Le webhook ne peut pas être vérifié directement (tables internes)
  console.log('ℹ️  Webhook configuré dans le dashboard (non vérifiable par API)');

  // 2. Créer un utilisateur de test
  const testEmail = `test_webhook_${Date.now()}@example.com`;
  console.log(`\n📧 Création d'un utilisateur test: ${testEmail}`);

  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      role: 'candidate',
      first_name: 'Test',
      last_name: 'Webhook',
      phone: '0600000000'
    }
  });

  if (error) {
    console.error('❌ Erreur création utilisateur:', error.message);
    return;
  }

  console.log('✅ Utilisateur créé avec ID:', newUser.user.id);

  // 3. Attendre un peu pour que le webhook se déclenche
  console.log('\n⏳ Attente du webhook (3 secondes)...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 4. Vérifier que les profils ont été créés
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUser.user.id)
    .single();

  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', newUser.user.id)
    .single();

  console.log('\n📊 RÉSULTATS:');
  
  if (profile) {
    console.log('✅ Profil général créé');
    console.log('   - Email:', profile.email);
    console.log('   - Role:', profile.role);
  } else {
    console.log('❌ Profil général NON créé');
  }

  if (candidateProfile) {
    console.log('✅ Profil candidat créé');
    console.log('   - Status:', candidateProfile.status);
    console.log('   - Qualification:', candidateProfile.qualification_status);
  } else {
    console.log('❌ Profil candidat NON créé');
  }

  // 5. Nettoyer (supprimer l'utilisateur test)
  await supabase.auth.admin.deleteUser(newUser.user.id);
  console.log('\n🧹 Utilisateur test supprimé');

  if (profile && candidateProfile) {
    console.log('\n🎉 WEBHOOK FONCTIONNEL !');
    console.log('Les nouveaux utilisateurs auront leurs profils créés automatiquement.');
  } else {
    console.log('\n⚠️  Le webhook ne semble pas fonctionner.');
    console.log('Vérifiez la configuration dans le dashboard Supabase.');
  }
}

testWebhook();