import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function directMigration() {
  console.log('🚀 Migration directe vers project_members...\n');

  try {
    // Utiliser la fonction invoke de Supabase
    const { data, error } = await supabase.functions.invoke('create-project-members-table', {
      body: {}
    });

    if (error) {
      throw error;
    }

    console.log('✅ Migration réussie!\n');
    
    if (data) {
      console.log('📊 Résultats:', JSON.stringify(data, null, 2));
    }

    // Tester la nouvelle table
    console.log('\n🔍 Test de la nouvelle table...');
    const { data: members, error: fetchError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', '16fd6a53-d0ed-49e9-aec6-99813eb23738');

    if (fetchError) {
      console.log('❌ Erreur:', fetchError);
    } else {
      console.log('✅ Membres du projet trouvés:');
      members?.forEach(m => {
        const icon = m.user_type === 'client' ? '👤' : '👥';
        const status = m.status === 'active' ? '✅' : '⏳';
        console.log(`   ${icon} ${m.display_name} - ${m.job_title} ${status}`);
      });
    }

    console.log('\n✨ Le nouveau système est maintenant actif!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

directMigration();