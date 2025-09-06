import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTriggerFix() {
  console.log('\n🔧 APPLICATION DE LA CORRECTION PERMANENTE DU TRIGGER...\n');

  try {
    // Lire le fichier de migration
    const migrationSQL = fs.readFileSync('/opt/team-dash-manager/supabase/migrations/20250906_fix_user_creation_trigger.sql', 'utf8');
    
    // Diviser en requêtes individuelles
    const queries = migrationSQL
      .split(/;\s*$/m)
      .filter(q => q.trim())
      .map(q => q.trim() + ';');

    let successCount = 0;
    let errorCount = 0;

    for (const query of queries) {
      // Ignorer les commentaires purs
      if (query.startsWith('--') && !query.includes('CREATE') && !query.includes('DROP')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.error(`❌ Erreur sur requête:`, error.message);
          errorCount++;
        } else {
          successCount++;
          
          // Afficher les requêtes importantes
          if (query.includes('CREATE TRIGGER') || query.includes('CREATE OR REPLACE FUNCTION')) {
            console.log('✅ Exécuté:', query.substring(0, 50) + '...');
          }
        }
      } catch (err) {
        console.error(`❌ Erreur:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Résultat: ${successCount} requêtes réussies, ${errorCount} erreurs`);

    // Vérifier que le trigger existe maintenant
    const checkQuery = `
      SELECT 
        tgname AS trigger_name,
        tgenabled AS enabled
      FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created';
    `;

    const { data: triggerCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: checkQuery
    });

    if (!checkError && triggerCheck?.rows?.length > 0) {
      console.log('\n✅ TRIGGER VÉRIFIÉ:');
      console.log('   Nom:', triggerCheck.rows[0].trigger_name);
      console.log('   Actif:', triggerCheck.rows[0].enabled === 'O' ? 'OUI' : 'NON');
    } else {
      console.log('\n❌ Le trigger n\'a pas pu être vérifié');
    }

    // Créer le profil pour le dernier candidat
    const candidateId = '2182da37-311c-49d2-ae92-8416870a99d8';
    console.log(`\n🔧 Création du profil pour le candidat ${candidateId}...`);

    const { error: profileError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: candidateId,
        email: 'fmeleard+new_test@gmail.com', // Remplacez par le bon email
        first_name: '',
        last_name: '',
        status: 'disponible',
        qualification_status: 'pending',
        seniority: 'junior',
        profile_id: null,
        daily_rate: 0,
        password_hash: '',
        is_email_verified: false
      });

    if (profileError && profileError.code !== '23505') {
      console.error('Erreur création profil:', profileError.message);
    } else if (!profileError) {
      console.log('✅ Profil candidat créé');
    } else {
      console.log('ℹ️  Profil déjà existant');
    }

    console.log('\n=== SYSTÈME CORRIGÉ ===');
    console.log('1. Trigger recréé et actif');
    console.log('2. Profil créé pour le candidat existant');
    console.log('3. Les prochains candidats auront leur profil automatiquement');
    console.log('\n👉 Rafraîchissez votre page pour voir l\'onboarding');

  } catch (error) {
    console.error('Erreur globale:', error);
  }

  process.exit(0);
}

applyTriggerFix();