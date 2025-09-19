import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Application de la migration IA Team...\n');

  try {
    // 1. Vérifier si la colonne prompt_id existe déjà
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'hr_profiles')
      .eq('column_name', 'prompt_id');

    const columnExists = columns && columns.length > 0;
    console.log(`✅ Colonne prompt_id: ${columnExists ? 'existe déjà' : 'à créer'}`);

    if (!columnExists) {
      // Lire le fichier SQL
      const sql = fs.readFileSync('./apply-ia-migration.sql', 'utf8');

      console.log('📝 Application de la migration SQL...');
      console.log('⚠️  Veuillez copier et exécuter le SQL suivant dans le Dashboard Supabase:');
      console.log('   Dashboard > SQL Editor > New Query\n');
      console.log('=' .repeat(60));
      console.log(sql);
      console.log('=' .repeat(60));
      console.log('\n👉 Lien direct: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new');
    }

    // 2. Vérifier si la table ia_resource_prompts existe
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'ia_resource_prompts');

    const tableExists = tables && tables.length > 0;
    console.log(`\n✅ Table ia_resource_prompts: ${tableExists ? 'existe déjà' : 'à créer'}`);

    // 3. Vérifier les prompts IA
    const { data: prompts } = await supabase
      .from('prompts_ia')
      .select('name, context')
      .in('context', ['ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst']);

    console.log(`\n✅ Prompts IA trouvés: ${prompts?.length || 0}`);
    if (prompts && prompts.length > 0) {
      prompts.forEach(p => console.log(`   - ${p.name} (${p.context})`));
    }

    // 4. Instructions finales
    if (!columnExists || !tableExists) {
      console.log('\n' + '⚠️ '.repeat(10));
      console.log('IMPORTANT: La migration doit être appliquée manuellement');
      console.log('1. Allez dans le Dashboard Supabase');
      console.log('2. Copiez le SQL ci-dessus');
      console.log('3. Exécutez-le dans SQL Editor');
      console.log('4. Relancez l\'application');
      console.log('⚠️ '.repeat(10));
    } else {
      console.log('\n✅ Tout est déjà configuré ! L\'application devrait fonctionner correctement.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

applyMigration();