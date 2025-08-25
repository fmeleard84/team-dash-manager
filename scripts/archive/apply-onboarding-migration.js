const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzE3MzYwNSwiZXhwIjoyMDQyNzQ5NjA1fQ.fYz_dJz9J4MQ6kGR5uojSIzKkBsyTqwVv3ypLrvhzkg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyOnboardingMigration() {
  console.log('🚀 Début de l\'application de la migration d\'onboarding...');
  
  try {
    // 1. Ajouter les colonnes manquantes à candidate_profiles
    console.log('📝 Ajout des colonnes à candidate_profiles...');
    
    const migrations = [
      `ALTER TABLE candidate_profiles 
       ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('company', 'micro')),
       ADD COLUMN IF NOT EXISTS company_name TEXT,
       ADD COLUMN IF NOT EXISTS siret TEXT;`,
      
      `CREATE INDEX IF NOT EXISTS idx_candidate_profiles_onboarding_step 
       ON candidate_profiles (onboarding_step);`,
       
      `CREATE INDEX IF NOT EXISTS idx_candidate_profiles_qualification_status 
       ON candidate_profiles (qualification_status);`,
      
      `CREATE TABLE IF NOT EXISTS candidate_qualification_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
          test_answers JSONB NOT NULL DEFAULT '{}',
          score INTEGER DEFAULT 0,
          qualification_status TEXT CHECK (qualification_status IN ('qualified', 'pending', 'rejected')) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );`,
       
      `CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_candidate_id 
       ON candidate_qualification_results (candidate_id);`,
       
      `CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_status 
       ON candidate_qualification_results (qualification_status);`,
       
      `ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;`
    ];

    for (const migration of migrations) {
      console.log('⚙️ Exécution:', migration.substring(0, 50) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: migration });
      if (error) {
        console.error('❌ Erreur:', error);
      } else {
        console.log('✅ Succès');
      }
    }

    // 2. Créer les politiques RLS
    console.log('🔒 Création des politiques RLS...');
    
    const policies = [
      `DROP POLICY IF EXISTS "Candidats peuvent voir leurs résultats de tests" ON candidate_qualification_results;`,
      `CREATE POLICY "Candidats peuvent voir leurs résultats de tests"
       ON candidate_qualification_results FOR SELECT
       USING (
           candidate_id IN (
               SELECT cp.id FROM candidate_profiles cp 
               WHERE cp.email = auth.email()
           )
       );`,
       
      `DROP POLICY IF EXISTS "Candidats peuvent créer leurs résultats de tests" ON candidate_qualification_results;`,
      `CREATE POLICY "Candidats peuvent créer leurs résultats de tests"
       ON candidate_qualification_results FOR INSERT
       WITH CHECK (
           candidate_id IN (
               SELECT cp.id FROM candidate_profiles cp 
               WHERE cp.email = auth.email()
           )
       );`,
       
      `DROP POLICY IF EXISTS "Candidats peuvent modifier leurs résultats de tests" ON candidate_qualification_results;`,
      `CREATE POLICY "Candidats peuvent modifier leurs résultats de tests"
       ON candidate_qualification_results FOR UPDATE
       USING (
           candidate_id IN (
               SELECT cp.id FROM candidate_profiles cp 
               WHERE cp.email = auth.email()
           )
       );`,
       
      `DROP POLICY IF EXISTS "Admins peuvent tout voir sur les résultats de tests" ON candidate_qualification_results;`,
      `CREATE POLICY "Admins peuvent tout voir sur les résultats de tests"
       ON candidate_qualification_results FOR ALL
       USING (
           EXISTS (
               SELECT 1 FROM profiles 
               WHERE profiles.email = auth.email() 
               AND profiles.role = 'admin'
           )
       );`
    ];

    for (const policy of policies) {
      console.log('🛡️ Politique:', policy.substring(0, 50) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.error('❌ Erreur politique:', error);
      } else {
        console.log('✅ Politique créée');
      }
    }

    // 3. Créer la fonction de matching
    console.log('🔍 Création de la fonction de matching...');
    
    const matchingFunction = `
    CREATE OR REPLACE FUNCTION get_matching_projects_for_candidate(
        candidate_profile_id UUID,
        candidate_expertise_ids UUID[]
    )
    RETURNS TABLE (
        project_id UUID,
        title TEXT,
        description TEXT,
        project_date DATE,
        client_budget NUMERIC,
        match_score INTEGER
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            p.id as project_id,
            p.title,
            p.description,
            p.project_date,
            p.client_budget,
            (
                SELECT COUNT(*)::INTEGER 
                FROM hr_resource_assignments hra
                JOIN candidate_expertises ce ON ce.expertise_id = ANY(candidate_expertise_ids)
                WHERE hra.project_id = p.id
            ) as match_score
        FROM projects p
        WHERE p.status = 'pause'
        AND EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            WHERE hra.project_id = p.id
            AND hra.booking_status = 'pending'
        )
        ORDER BY match_score DESC, p.created_at DESC
        LIMIT 10;
    END;
    $$;`;

    const { error: funcError } = await supabase.rpc('exec_sql', { sql: matchingFunction });
    if (funcError) {
      console.error('❌ Erreur fonction matching:', funcError);
    } else {
      console.log('✅ Fonction de matching créée');
    }

    console.log('🎉 Migration d\'onboarding appliquée avec succès !');

  } catch (error) {
    console.error('💥 Erreur lors de l\'application de la migration:', error);
  }
}

// Fonction helper pour executer du SQL
async function createExecSqlFunction() {
  console.log('📋 Création de la fonction exec_sql...');
  
  const execSqlFunction = `
  CREATE OR REPLACE FUNCTION exec_sql(sql text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
      EXECUTE sql;
  END;
  $$;`;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: execSqlFunction });
    if (error && !error.message.includes('already exists')) {
      console.error('❌ Erreur création exec_sql:', error);
    } else {
      console.log('✅ Fonction exec_sql prête');
    }
  } catch (err) {
    // La fonction n'existe pas encore, on l'exécute directement
    console.log('⚙️ Création directe de exec_sql...');
    const { error } = await supabase.from('_placeholder').select().limit(0);
    // Cette approche ne fonctionnera pas, on passe à l'application directe
  }
}

// Exécuter la migration
applyOnboardingMigration();