import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testVectorSystem() {
  console.log('🧪 TEST DU SYSTÈME VECTORIEL\n');
  console.log('=' .repeat(50));

  try {
    // 1. Vérifier les tables
    console.log('\n📊 1. Vérification des tables...');
    
    const { count: faqCount } = await supabase
      .from('faq_items')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Table faq_items : ${faqCount} entrées`);

    const { count: promptCount } = await supabase
      .from('prompts_ia')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Table prompts_ia : ${promptCount} entrées`);

    const { count: queueCount } = await supabase
      .from('embedding_sync_queue')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Table embedding_sync_queue : ${queueCount} entrées`);

    // 2. Ajouter une nouvelle FAQ
    console.log('\n📝 2. Ajout d\'une nouvelle FAQ de test...');
    
    const testFAQ = {
      question: 'Comment tester le système vectoriel ?',
      answer: 'Pour tester le système vectoriel, créez une FAQ comme celle-ci. Le système devrait automatiquement créer une entrée dans la queue de synchronisation grâce au trigger PostgreSQL. Ensuite, la fonction process-embedding-queue génère l\'embedding via OpenAI.',
      category: 'Test',
      tags: ['test', 'vectoriel', 'embedding']
    };

    const { data: newFAQ, error: faqError } = await supabase
      .from('faq_items')
      .insert(testFAQ)
      .select()
      .single();

    if (faqError) {
      console.error('   ❌ Erreur création FAQ:', faqError);
      return;
    }

    console.log(`   ✅ FAQ créée avec ID: ${newFAQ.id}`);

    // 3. Vérifier la queue de synchronisation
    console.log('\n🔄 3. Vérification de la queue de synchronisation...');
    
    // Attendre un peu pour que le trigger s'exécute
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_sync_queue')
      .select('*')
      .eq('source_id', newFAQ.id)
      .eq('source_table', 'faq_items');

    if (queueError) {
      console.error('   ❌ Erreur lecture queue:', queueError);
    } else if (!queueItems || queueItems.length === 0) {
      console.log('   ⚠️  Aucune entrée dans la queue');
      console.log('   💡 Le trigger n\'est peut-être pas créé. Exécutez ce SQL:');
      console.log(`
CREATE OR REPLACE FUNCTION add_to_embedding_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'delete', OLD.question || ' ' || OLD.answer, 
            jsonb_build_object('type', 'faq', 'category', OLD.category));
  ELSE
    INSERT INTO embedding_sync_queue (source_table, source_id, action, content, metadata)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, LOWER(TG_OP), NEW.question || ' ' || NEW.answer,
            jsonb_build_object('type', 'faq', 'category', NEW.category, 'question', NEW.question, 'answer', NEW.answer));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_faq_embeddings
AFTER INSERT OR UPDATE OR DELETE ON faq_items
FOR EACH ROW EXECUTE FUNCTION add_to_embedding_queue();
      `);
    } else {
      console.log(`   ✅ ${queueItems.length} entrée(s) dans la queue`);
      console.log(`   📋 Status: ${queueItems[0].status}`);
    }

    // 4. Traiter la queue
    console.log('\n⚙️  4. Traitement de la queue d\'embeddings...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-embedding-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'process', batchSize: 10 })
    });

    const result = await response.json();
    
    if (result.success === false) {
      console.log('   ❌ Erreur traitement:', result.error);
      if (result.error?.includes('OPENAI_API_KEY')) {
        console.log('\n   🔑 IMPORTANT: Configurez votre clé OpenAI !');
        console.log('   1. Dashboard Supabase → Settings → Edge Functions');
        console.log('   2. Section "Environment Variables"');
        console.log('   3. Add new secret: OPENAI_API_KEY = sk-...');
      }
    } else {
      console.log(`   ✅ Traité: ${result.processed || 0} items`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Erreurs: ${result.errors.length}`);
        result.errors.forEach(e => console.log(`      - ${e.error}`));
      }
    }

    // 5. Vérifier les embeddings
    console.log('\n🔍 5. Vérification des embeddings...');
    
    const { data: embeddings, error: embError } = await supabase
      .from('documentation_embeddings')
      .select('id, content_type, source_table, source_id')
      .eq('source_id', newFAQ.id);

    if (embError) {
      console.log('   ❌ Erreur lecture embeddings:', embError);
    } else if (!embeddings || embeddings.length === 0) {
      console.log('   ⚠️  Aucun embedding trouvé');
      console.log('   💡 Vérifiez que la clé OpenAI est configurée');
    } else {
      console.log(`   ✅ ${embeddings.length} embedding(s) créé(s)`);
    }

    // 6. Test de recherche
    console.log('\n🔎 6. Test de recherche (si embeddings disponibles)...');
    
    if (embeddings && embeddings.length > 0) {
      // Recherche textuelle simple
      const { data: searchResults } = await supabase
        .from('faq_items')
        .select('question, answer')
        .textSearch('question', 'vectoriel');
      
      if (searchResults && searchResults.length > 0) {
        console.log(`   ✅ Recherche textuelle: ${searchResults.length} résultat(s)`);
      }
    }

    // 7. Status final
    console.log('\n📊 7. Status de la queue...');
    
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-embedding-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'status' })
    });

    const status = await statusResponse.json();
    if (status.status) {
      console.log('   Queue status:');
      status.status.forEach(s => {
        console.log(`   - ${s.source_table}: ${s.pending_count} pending, ${s.completed_count} completed`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ TEST TERMINÉ !');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Si la clé OpenAI n\'est pas configurée, ajoutez-la');
    console.log('2. Créez plus de FAQs via l\'interface admin');
    console.log('3. Les embeddings seront générés automatiquement');
    console.log('4. L\'IA pourra chercher dans ces contenus');

  } catch (error) {
    console.error('\n❌ Erreur globale:', error);
  }
}

// Exécuter le test
testVectorSystem();