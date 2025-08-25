import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.Uy3bOGD5C3-Q1Ggaod8Y1FJBQqEQtcv4qx4o2eSasXE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function callCleanup() {
  console.log('🧹 Appel de la fonction de nettoyage...');
  
  try {
    const { data, error } = await supabase.functions.invoke('cleanup-test-projects');
    
    if (error) {
      console.error('❌ Erreur:', error.message);
    } else {
      console.log('✅ Résultat:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
  }
}

callCleanup().catch(console.error);