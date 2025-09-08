import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  console.log('🔍 Vérification de la structure de client_profiles...\n');

  try {
    // Récupérer un enregistrement existant pour voir la structure
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('📊 Colonnes disponibles:');
      console.log(Object.keys(data[0]));
      console.log('\n📄 Exemple de données:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ Aucun enregistrement trouvé dans client_profiles');
    }
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

checkStructure();