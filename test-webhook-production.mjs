#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase Production
const SUPABASE_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Email de test unique avec timestamp
const testEmail = `webhook_test_${Date.now()}@vaya.rip`;
const testPassword = 'TestPassword123!';

console.log('\n🔧 Test du Webhook de création automatique des profils');
console.log('======================================================');
console.log(`📧 Email de test: ${testEmail}`);
console.log('');

async function testWebhook() {
  console.log('1️⃣ Création de l\'utilisateur...');

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      emailRedirectTo: 'https://vaya.rip/auth/callback',
      data: {
        first_name: 'Webhook',
        last_name: 'Test',
        phone: '+33612345678',
        role: 'candidate'
      }
    }
  });

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (data.user) {
    console.log('✅ Utilisateur créé avec ID:', data.user.id);
    console.log('');
    console.log('2️⃣ Vérification du profil (attendez 2 secondes pour le webhook)...');

    // Attendre un peu pour que le webhook s'exécute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier le profil principal
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      console.log('✅ PROFIL CRÉÉ AUTOMATIQUEMENT !');
      console.log('   - Nom complet:', profile.first_name, profile.last_name);
      console.log('   - Email:', profile.email);
      console.log('   - Téléphone:', profile.phone);
      console.log('   - Rôle:', profile.role);
    } else {
      console.log('❌ Profil NON trouvé - Le webhook n\'a pas fonctionné');
      console.log('   Erreur:', profileError?.message);
    }

    // Vérifier le profil candidat
    console.log('');
    console.log('3️⃣ Vérification du profil candidat...');

    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (candidateProfile) {
      console.log('✅ PROFIL CANDIDAT CRÉÉ !');
      console.log('   - Status:', candidateProfile.status);
      console.log('   - Qualification:', candidateProfile.qualification_status);
    } else {
      console.log('❌ Profil candidat NON trouvé');
    }

    console.log('');
    console.log('📊 RÉSUMÉ:');
    console.log('----------');
    if (profile && candidateProfile) {
      console.log('✅ Webhook fonctionnel - Tous les profils créés !');
    } else if (profile && !candidateProfile) {
      console.log('⚠️  Webhook partiellement fonctionnel - Profil principal OK, candidat manquant');
    } else {
      console.log('❌ Webhook non fonctionnel - Vérifiez la configuration');
      console.log('');
      console.log('Vérifiez dans le dashboard :');
      console.log('1. Database → Webhooks → Le webhook existe ?');
      console.log('2. Functions → handle-new-user-simple → Voir les logs');
    }
  }
}

// Lancer le test
testWebhook().catch(console.error);