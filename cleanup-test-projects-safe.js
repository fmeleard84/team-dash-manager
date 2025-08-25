import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.Uy3bOGD5C3-Q1Ggaod8Y1FJBQqEQtcv4qx4o2eSasXE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupTestProjects() {
  console.log('🧹 NETTOYAGE DES PROJETS DE TEST (Via Function)');
  console.log('=====================================\n');
  
  try {
    // Appeler la fonction serverless pour nettoyer les projets
    const { data, error } = await supabase.functions.invoke('cleanup-test-projects', {
      body: {
        testProjectTitles: ['Mon projet perso', 'Test 2', 'test6', 'test 6']
      }
    });
    
    if (error) {
      console.error('❌ Erreur:', error.message);
    } else {
      console.log('✅ Résultat:', data);
    }
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
  }
  
  console.log('\n=====================================');
  console.log('✅ NETTOYAGE TERMINÉ');
}

cleanupTestProjects().catch(console.error);