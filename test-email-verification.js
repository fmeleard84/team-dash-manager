import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI3ODA0NjIsImV4cCI6MjAzODM1NjQ2Mn0.V4av_TWAjhVqgDpOvvD_M2PVks1wJCYD5_hdZ3xNPms';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVerification() {
  console.log('🔍 Test de vérification d\'email\n');
  
  // Récupérer le token depuis l'URL
  const urlParams = new URLSearchParams(process.argv[2] || '');
  const token = urlParams.get('token') || process.argv[2];
  
  if (!token) {
    console.error('❌ Aucun token fourni');
    console.log('Usage: node test-email-verification.js TOKEN');
    return;
  }
  
  console.log('Token:', token);
  console.log('Tentative de vérification...\n');
  
  try {
    // Essayer de vérifier le token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });
    
    if (error) {
      console.error('❌ Erreur de vérification:', error.message);
      console.error('Détails:', error);
      return;
    }
    
    if (data?.session) {
      console.log('✅ Email vérifié avec succès !');
      console.log('Utilisateur:', data.session.user.email);
      console.log('ID:', data.session.user.id);
    } else if (data?.user) {
      console.log('✅ Token valide');
      console.log('Utilisateur:', data.user.email);
      console.log('Email confirmé:', data.user.email_confirmed_at);
    } else {
      console.log('⚠️  Réponse inattendue:', data);
    }
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

testVerification();