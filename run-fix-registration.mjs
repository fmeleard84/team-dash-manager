import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function runFix() {
  try {
    console.log('🚀 Correction du trigger handle_new_user...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-candidate-registration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Succès:', result.message);
      console.log('\nChangements appliqués:');
      result.details.changes.forEach(change => {
        console.log(`  - ${change}`);
      });
    } else {
      console.error('❌ Erreur:', result.error);
      console.error('Détails:', result.details);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error.message);
  }
}

runFix();