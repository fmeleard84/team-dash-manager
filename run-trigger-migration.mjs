import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function runMigration() {
  try {
    console.log('🚀 Application de la migration du trigger...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/apply-trigger-migration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅', result.message);
      console.log('\nDétails:');
      console.log(`  - Trigger créé: ${result.details.triggerCreated ? 'OUI' : 'NON'}`);
      console.log(`  - Profils créés: ${result.details.profilesCreated}`);
      console.log(`  - Total utilisateurs: ${result.details.totalUsers}`);
      console.log('\n=== SYSTÈME CORRIGÉ ===');
      console.log('Le trigger est maintenant actif');
      console.log('Les nouveaux candidats auront leur profil créé automatiquement');
      console.log('\n👉 Rafraîchissez votre page pour voir l\'onboarding');
    } else {
      console.error('❌ Erreur:', result.error);
      console.error('Détails:', result.details);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

runMigration();