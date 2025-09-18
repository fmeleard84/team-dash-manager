import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const candidateId = 'f11d64ab-df30-47e6-9db0-d20c14259cb6';

async function testSimple() {
  console.log('🧪 Test simple de la table candidate_qualification_results\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test de la requête exacte qui échoue dans l'interface
  console.log('Test de la requête qui génère l\'erreur 406:');
  const { data, error, status } = await supabase
    .from('candidate_qualification_results')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Status HTTP:', status);

  if (error) {
    console.log('❌ Erreur:', error.message);
    console.log('Code erreur:', error.code);
    console.log('Détails:', error);
  } else {
    console.log('✅ Requête réussie !');
    console.log('Nombre de résultats:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Premier résultat:', {
        id: data[0].id,
        score: data[0].score,
        created_at: data[0].created_at
      });
    } else {
      console.log('ℹ️ Aucun résultat trouvé (normal si pas encore de test passé)');
    }
  }
}

testSimple().catch(console.error);