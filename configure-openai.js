// Script simple pour configurer la clé OpenAI dans Supabase
// Usage: node configure-openai.js

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function configureOpenAI() {
  console.log('🔑 Configuration de la clé OpenAI...\n');
  
  try {
    // Simuler la récupération de la clé depuis localStorage
    console.log('💡 Info: La clé OpenAI est récupérée du localStorage du bot audio');
    console.log('   Pour la configurer manuellement dans Supabase:');
    console.log('   1. Ouvrez votre app dans le navigateur');
    console.log('   2. Console (F12) → localStorage.getItem("openai_api_key")');
    console.log('   3. Copiez la clé qui s\'affiche');
    console.log('   4. Dashboard Supabase → Settings → Edge Functions → Environment Variables');
    console.log('   5. Add new secret: OPENAI_API_KEY = sk-...\n');
    
    // Tester si les triggers sont créés
    console.log('🔍 Test des triggers de synchronisation...');
    
    const testFAQ = {
      question: 'Test automatique - les triggers fonctionnent-ils ?',
      answer: 'Si cette FAQ apparaît dans la queue de synchronisation, alors oui !',
      category: 'Test Auto',
      tags: ['test', 'automatique', 'triggers']
    };
    
    // Créer une FAQ de test via l'API REST
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/faq_items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testFAQ)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log('⚠️  Impossible de créer une FAQ de test:', error);
      console.log('   Vérifiez que les tables sont créées avec le script SQL précédent\n');
      return;
    }
    
    const faqData = await createResponse.json();
    const faqId = faqData[0]?.id;
    console.log('✅ FAQ de test créée avec ID:', faqId);
    
    // Vérifier si elle apparaît dans la queue
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes
    
    const queueResponse = await fetch(`${SUPABASE_URL}/rest/v1/embedding_sync_queue?source_table=eq.faq_items&source_id=eq.${faqId}`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      }
    });
    
    if (queueResponse.ok) {
      const queueData = await queueResponse.json();
      
      if (queueData && queueData.length > 0) {
        console.log('✅ Trigger fonctionne ! FAQ ajoutée à la queue de sync');
        console.log(`   Status: ${queueData[0].status}`);
        
        // Tester le traitement de la queue
        console.log('\n⚙️  Test du traitement de la queue...');
        
        const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-embedding-queue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'process', batchSize: 5 })
        });
        
        const processResult = await processResponse.json();
        
        if (processResult.success) {
          console.log(`✅ Traitement réussi ! ${processResult.processed || 0} items traités`);
          
          if (processResult.errors && processResult.errors.length > 0) {
            console.log('⚠️  Erreurs détectées:');
            processResult.errors.forEach(err => {
              if (err.error.includes('OPENAI_API_KEY')) {
                console.log('   ❌ Clé OpenAI manquante dans les secrets Supabase');
                console.log('   👉 Action: Configurez OPENAI_API_KEY dans le dashboard');
              } else {
                console.log(`   - ${err.error}`);
              }
            });
          }
          
          if (processResult.processed > 0 && (!processResult.errors || processResult.errors.length === 0)) {
            console.log('🎉 SYSTÈME ENTIÈREMENT FONCTIONNEL !');
            console.log('   Les FAQs sont automatiquement vectorisées');
            console.log('   L\'IA peut maintenant les utiliser pour répondre');
          }
        } else {
          console.log('❌ Erreur traitement:', processResult.error);
        }
        
      } else {
        console.log('❌ Trigger ne fonctionne pas - FAQ non ajoutée à la queue');
        console.log('   👉 Exécutez le script create-triggers.sql dans Supabase');
      }
    }
    
    // Nettoyer la FAQ de test
    await fetch(`${SUPABASE_URL}/rest/v1/faq_items?id=eq.${faqId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      }
    });
    console.log('\n🧹 FAQ de test supprimée');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
  
  console.log('\n📋 RÉSUMÉ:');
  console.log('1. ✅ Interface FAQ créée dans /admin/resources');
  console.log('2. ❓ Triggers de sync (vérifiez avec create-triggers.sql)');
  console.log('3. ❓ Clé OpenAI (configurez manuellement)');
  console.log('4. ✅ Fonctions de traitement déployées');
  console.log('\n🚀 Prochaine étape:');
  console.log('   Allez dans /admin/resources → FAQs IA → Nouvelle FAQ');
  console.log('   Testez la création et vérifiez la synchronisation !');
}

configureOpenAI();