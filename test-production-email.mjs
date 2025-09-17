#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase Production
const SUPABASE_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Email de test unique avec timestamp
const testEmail = `test_prod_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

console.log('\n🚀 Test d\'inscription en PRODUCTION');
console.log('=====================================');
console.log(`📧 Email de test: ${testEmail}`);
console.log(`🔗 URL de production: https://vaya.rip`);
console.log('');

async function testSignup() {
  console.log('📝 Tentative d\'inscription...');

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      emailRedirectTo: 'https://vaya.rip/auth/callback',
      data: {
        first_name: 'Test',
        last_name: 'Production',
        role: 'candidate'
      }
    }
  });

  if (error) {
    console.error('❌ Erreur lors de l\'inscription:', error.message);
    return;
  }

  if (data.user) {
    console.log('✅ Inscription réussie !');
    console.log('');
    console.log('📬 VÉRIFIEZ MAINTENANT :');
    console.log('---------------------------');
    console.log('1. L\'email vient-il de hello@vaya.rip ? (et NON de noreply@mail.app.supabase.io)');
    console.log('2. Le lien de confirmation pointe-t-il vers https://vaya.rip ?');
    console.log('3. L\'email utilise-t-il le template personnalisé ?');
    console.log('');
    console.log('📋 Détails de l\'utilisateur créé:');
    console.log(`   - ID: ${data.user.id}`);
    console.log(`   - Email: ${data.user.email}`);
    console.log(`   - Confirmé: ${data.user.confirmed_at ? 'Oui' : 'Non'}`);

    // Vérifier si le profil a été créé
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      console.log('');
      console.log('✅ Profil créé automatiquement:');
      console.log(`   - Nom: ${profile.first_name} ${profile.last_name}`);
      console.log(`   - Rôle: ${profile.role}`);
    } else {
      console.log('');
      console.log('⚠️  Profil non trouvé (vérifiez le webhook)');
    }
  }
}

// Lancer le test
testSignup().catch(console.error);