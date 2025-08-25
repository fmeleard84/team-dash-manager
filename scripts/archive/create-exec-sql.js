import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzE3MzYwNSwiZXhwIjoyMDQyNzQ5NjA1fQ.fYz_dJz9J4MQ6kGR5uojSIzKkBsyTqwVv3ypLrvhzkg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlFunction() {
  console.log('📋 Création de la fonction exec_sql...');
  
  try {
    // Appeler directement la fonction de migration
    const { data, error } = await supabase.functions.invoke('apply-onboarding-migration');
    
    if (error) {
      console.error('❌ Erreur:', error);
    } else {
      console.log('✅ Résultat:', data);
    }
    
  } catch (err) {
    console.error('💥 Erreur lors de l\'appel:', err);
  }
}

createExecSqlFunction();