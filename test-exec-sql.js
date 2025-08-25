import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExecSql() {
  console.log('🧪 Test de la fonction exec_sql...\n');

  try {
    // Test simple SELECT
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT version()' 
    });

    if (error) {
      console.error('❌ Erreur:', error);
    } else {
      console.log('✅ La fonction exec_sql fonctionne !');
      console.log('Résultat:', data);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testExecSql();