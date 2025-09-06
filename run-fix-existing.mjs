import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function runFix() {
  try {
    console.log('🚀 Correction des candidats existants...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-existing-candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Succès:', result.message);
      console.log('\nStatistiques:');
      console.log(`  - Total candidats: ${result.stats.total}`);
      console.log(`  - Profils créés: ${result.stats.created}`);
      console.log(`  - Profils existants: ${result.stats.existing}`);
      console.log(`  - Erreurs: ${result.stats.errors}`);
    } else {
      console.error('❌ Erreur:', result.error);
      console.error('Détails:', result.details);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error.message);
  }
}

runFix();