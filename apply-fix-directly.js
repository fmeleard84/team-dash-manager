import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Application directe du correctif...\n');

  try {
    // Utiliser l'API admin pour exécuter le SQL directement
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/fix_candidate_registration`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      // La fonction n'existe pas, essayons de l'invoquer via Edge Function
      console.log('Invocation de la fonction Edge fix-candidate-registration...');
      
      const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/fix-candidate-registration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await edgeResponse.json();
      
      if (result.success) {
        console.log('✅ Correctif appliqué avec succès via Edge Function!');
      } else {
        throw new Error(result.error || 'Erreur lors de l\'application du correctif');
      }
    } else {
      console.log('✅ Correctif appliqué avec succès!');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n📝 Pour appliquer le correctif manuellement :');
    console.log('1. Allez dans le Dashboard Supabase');
    console.log('2. Ouvrez l\'éditeur SQL');
    console.log('3. Exécutez le contenu du fichier FIX_CANDIDATE_REGISTRATION.sql');
  }
}

applyFix();