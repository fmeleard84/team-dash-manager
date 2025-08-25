import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzE3MzYwNSwiZXhwIjoyMDQyNzQ5NjA1fQ.fYz_dJz9J4MQ6kGR5uojSIzKkBsyTqwVv3ypLrvhzkg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCandidateRLS() {
  console.log('🔧 Correction des politiques RLS pour candidate_profiles...');
  
  try {
    // Lire le fichier SQL
    const sqlContent = readFileSync('./fix-candidate-rls.sql', 'utf8');
    
    // Diviser en commandes individuelles
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('\\d'));
    
    console.log(`📝 Exécution de ${commands.length} commandes SQL...`);
    
    for (const [index, command] of commands.entries()) {
      if (command.trim()) {
        console.log(`⚙️ Commande ${index + 1}/${commands.length}: ${command.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });
        
        if (error) {
          console.error(`❌ Erreur commande ${index + 1}:`, error);
        } else {
          console.log(`✅ Commande ${index + 1} réussie`);
        }
        
        // Petit délai entre les commandes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Test de création d'un profil candidat
    console.log('\n🧪 Test de création de profil candidat...');
    const { data: testProfile, error: testError } = await supabase
      .from('candidate_profiles')
      .insert({
        email: 'test-candidate@example.com',
        first_name: 'Test',
        last_name: 'Candidate',
        qualification_status: 'pending'
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Test échoué:', testError);
    } else {
      console.log('✅ Test réussi, profil créé:', testProfile.id);
      
      // Nettoyer le profil de test
      await supabase
        .from('candidate_profiles')
        .delete()
        .eq('id', testProfile.id);
    }
    
  } catch (error) {
    console.error('💥 Erreur lors de la correction RLS:', error);
  }
}

fixCandidateRLS();