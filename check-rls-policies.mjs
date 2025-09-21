import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkRLSPolicies() {
  console.log('🔍 Vérification des politiques RLS pour candidate_profiles...\n');

  try {
    // Requête pour récupérer les politiques RLS
    const { data: policies, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          pol.polname as policy_name,
          pol.polcmd as command,
          CASE
            WHEN pol.polpermissive THEN 'PERMISSIVE'
            ELSE 'RESTRICTIVE'
          END as type,
          pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
          pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
        WHERE cls.relname = 'candidate_profiles'
          AND nsp.nspname = 'public'
        ORDER BY pol.polname;
      `
    });

    if (error) {
      console.error('❌ Erreur lors de la récupération des politiques:', error);

      // Essayer une approche alternative
      console.log('\n🔄 Tentative alternative...\n');

      // Tester si on peut créer un profil candidat en tant que service
      const testProfile = {
        id: 'test-' + Date.now(),
        first_name: 'Test',
        last_name: 'RLS',
        email: 'test@test.com',
        seniority: 'senior',
        status: 'disponible',
        profile_id: 'test-' + Date.now(),
        daily_rate: 100,
        is_email_verified: true
      };

      const { data: insertTest, error: insertError } = await supabase
        .from('candidate_profiles')
        .insert(testProfile);

      if (insertError) {
        console.log('❌ Impossible de créer avec service key:', insertError.message);
      } else {
        console.log('✅ Création possible avec service key');

        // Nettoyer
        await supabase.from('candidate_profiles').delete().eq('id', testProfile.id);
      }

      return;
    }

    if (!policies || policies.length === 0) {
      console.log('⚠️ Aucune politique RLS trouvée pour candidate_profiles');
      console.log('Cela pourrait signifier que RLS n\'est pas activé ou qu\'il n\'y a pas de politiques définies.');
      return;
    }

    console.log(`📋 ${policies.length} politique(s) trouvée(s):\n`);

    for (const policy of policies) {
      console.log(`📌 Politique: ${policy.policy_name}`);
      console.log(`   - Commande: ${policy.command}`);
      console.log(`   - Type: ${policy.type}`);
      if (policy.using_expression) {
        console.log(`   - Expression USING: ${policy.using_expression}`);
      }
      if (policy.with_check_expression) {
        console.log(`   - Expression WITH CHECK: ${policy.with_check_expression}`);
      }
      console.log('');
    }

    // Analyser les problèmes potentiels
    console.log('\n🔎 Analyse des problèmes potentiels:\n');

    const insertPolicies = policies.filter(p => p.command === 'INSERT' || p.command === 'ALL');
    if (insertPolicies.length === 0) {
      console.log('❌ Aucune politique INSERT trouvée - personne ne peut créer de candidats !');
    } else {
      for (const policy of insertPolicies) {
        if (policy.with_check_expression?.includes('auth.uid()')) {
          console.log(`⚠️ La politique "${policy.policy_name}" nécessite que auth.uid() corresponde à quelque chose`);
          console.log('   Cela pourrait bloquer la création de profils pour des IA (qui n\'ont pas d\'auth.uid())');
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
}

checkRLSPolicies();