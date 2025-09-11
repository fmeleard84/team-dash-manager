// Script pour tester et configurer le système vectoriel

async function testVectorSetup() {
  const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

  try {
    console.log('📊 Test du système vectoriel...\n');
    
    // Appeler la fonction pour appliquer les migrations
    const response = await fetch(`${SUPABASE_URL}/functions/v1/apply-vector-migrations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log('✅ Résultats:\n');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.summary) {
      console.log('\n📊 Résumé:');
      console.log(`- pgvector installé: ${result.summary.pgvector_ready ? '✅' : '❌'}`);
      console.log(`- Tables créées: ${result.summary.tables_created}`);
      console.log(`- Tables échouées: ${result.summary.tables_failed}`);
      console.log(`- OpenAI configuré: ${result.summary.openai_configured ? '✅' : '❌'}`);
      console.log(`- Prêt pour production: ${result.summary.ready_for_production ? '✅' : '❌'}`);
    }
    
    if (result.next_steps && result.next_steps.length > 0) {
      console.log('\n📝 Prochaines étapes:');
      result.next_steps.forEach(step => console.log(`  - ${step}`));
    }
    
    // Récupérer la clé OpenAI du localStorage si disponible
    if (typeof window !== 'undefined' && localStorage.getItem('openai_api_key')) {
      console.log('\n💡 Info: Clé OpenAI trouvée dans localStorage');
      console.log('   Pour l\'utiliser dans les Edge Functions, ajoutez-la dans:');
      console.log('   Dashboard Supabase > Settings > Edge Functions > Secrets');
      console.log('   Nom: OPENAI_API_KEY');
      console.log('   Valeur: [votre clé qui commence par sk-...]');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le test
testVectorSetup();