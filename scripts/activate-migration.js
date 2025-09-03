import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function activateMigration() {
  console.log('🚀 Activation de la migration vers project_members...\n');

  try {
    // Appeler la fonction Edge pour créer la table et migrer les données
    const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/create-project-members-table', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Migration activée avec succès!\n');
    console.log('📊 Statistiques:');
    console.log(`   - Total membres: ${result.stats?.total_members || 0}`);
    console.log(`   - Clients: ${result.stats?.clients || 0}`);
    console.log(`   - Candidats: ${result.stats?.candidates || 0}`);
    console.log(`   - Actifs: ${result.stats?.active || 0}`);
    console.log(`   - En attente: ${result.stats?.pending || 0}`);
    
    if (result.example_project?.members) {
      console.log('\n📋 Exemple - Projet "Comptable junior client_2":');
      result.example_project.members.forEach(member => {
        const icon = member.type === 'client' ? '👤' : '👥';
        const status = member.status === 'active' ? '✅' : '⏳';
        console.log(`   ${icon} ${member.name} - ${member.job} ${status}`);
      });
    }

    // Vérifier que la table existe bien
    console.log('\n🔍 Vérification de la table...');
    const { data: testData, error: testError } = await supabase
      .from('project_members')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Erreur lors de la vérification:', testError);
    } else {
      console.log('✅ Table project_members accessible!');
      console.log('✅ Le nouveau système est maintenant actif!');
    }

    console.log('\n✨ Migration terminée avec succès!');
    console.log('📝 Le hook useProjectUsers utilise maintenant automatiquement la nouvelle table.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    console.log('\n💡 Essayez de relancer le script ou vérifiez les logs Supabase.');
  }
}

activateMigration();