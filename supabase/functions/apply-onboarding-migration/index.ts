import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Début de l\'application de la migration d\'onboarding...');

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
       ON candidate_profiles (qualification_status);`
    ];

    for (const migration of migrations) {
      console.log('⚙️ Exécution:', migration.substring(0, 50) + '...');
      const { error } = await supabaseClient.rpc('exec_sql', { sql_query: migration });
      if (error) {
        console.error('❌ Erreur:', error);
      } else {
        console.log('✅ Succès');
      }
    }

    // 2. Créer la table candidate_qualification_results si elle n'existe pas
    console.log('📊 Création de la table candidate_qualification_results...');
    
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS candidate_qualification_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        test_answers JSONB NOT NULL DEFAULT '{}',
        score INTEGER DEFAULT 0,
        qualification_status TEXT CHECK (qualification_status IN ('qualified', 'pending', 'rejected')) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`;

    const { error: tableError } = await supabaseClient.rpc('exec_sql', { sql_query: createTableSql });
    if (tableError) {
      console.error('❌ Erreur création table:', tableError);
    } else {
      console.log('✅ Table candidate_qualification_results créée');
    }

    // 3. Créer les index
    const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_candidate_id 
    ON candidate_qualification_results (candidate_id);
    
    CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_status 
    ON candidate_qualification_results (qualification_status);`;

    const { error: indexError } = await supabaseClient.rpc('exec_sql', { sql_query: indexSql });
    if (indexError) {
      console.error('❌ Erreur index:', indexError);
    } else {
      console.log('✅ Index créés');
    }

    // 4. Activer RLS sur la nouvelle table
    const rlsSql = `ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabaseClient.rpc('exec_sql', { sql_query: rlsSql });
    if (rlsError) {
      console.error('❌ Erreur RLS:', rlsError);
    } else {
      console.log('✅ RLS activé');
    }

    console.log('🎉 Migration d\'onboarding appliquée avec succès !');

    return new Response(
      JSON.stringify({
        message: 'Migration d\'onboarding appliquée avec succès',
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur lors de l\'application de la migration:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})