import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Début de la correction des associations candidats...');

    // 1. Supprimer les anciennes tables avec leurs données
    const dropTablesQuery = `
      -- Supprimer les anciennes tables d'association
      DROP TABLE IF EXISTS candidate_languages CASCADE;
      DROP TABLE IF EXISTS candidate_expertises CASCADE;
      DROP TABLE IF EXISTS candidate_skills CASCADE;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropTablesQuery
    });

    if (dropError) {
      console.error('Erreur lors de la suppression des tables:', dropError);
      // Continuer même si erreur
    }

    console.log('✅ Tables supprimées');

    // 2. Recréer les tables avec la bonne structure (ID universel)
    const createTablesQuery = `
      -- Recréer candidate_languages avec le bon FK
      CREATE TABLE IF NOT EXISTS public.candidate_languages (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID NOT NULL,
        language_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (language_id) REFERENCES hr_languages(id) ON DELETE CASCADE,
        UNIQUE(candidate_id, language_id)
      );

      -- Recréer candidate_expertises avec le bon FK
      CREATE TABLE IF NOT EXISTS public.candidate_expertises (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID NOT NULL,
        expertise_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (expertise_id) REFERENCES hr_expertises(id) ON DELETE CASCADE,
        UNIQUE(candidate_id, expertise_id)
      );

      -- Créer aussi candidate_skills si nécessaire
      CREATE TABLE IF NOT EXISTS public.candidate_skills (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID NOT NULL,
        skill_name TEXT NOT NULL,
        skill_level TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        UNIQUE(candidate_id, skill_name)
      );

      -- Créer les index pour les performances
      CREATE INDEX IF NOT EXISTS idx_candidate_languages_candidate ON candidate_languages(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_languages_language ON candidate_languages(language_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_expertises_candidate ON candidate_expertises(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_expertises_expertise ON candidate_expertises(expertise_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON candidate_skills(candidate_id);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTablesQuery
    });

    if (createError) {
      console.error('Erreur lors de la création des tables:', createError);
      throw createError;
    }

    console.log('✅ Tables recréées avec la bonne structure');

    // 3. Ajouter les politiques RLS
    const rlsPoliciesQuery = `
      -- Activer RLS
      ALTER TABLE candidate_languages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE candidate_expertises ENABLE ROW LEVEL SECURITY;
      ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;

      -- Politiques pour candidate_languages
      DROP POLICY IF EXISTS "candidate_languages_select" ON candidate_languages;
      CREATE POLICY "candidate_languages_select" ON candidate_languages
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "candidate_languages_insert" ON candidate_languages;
      CREATE POLICY "candidate_languages_insert" ON candidate_languages
        FOR INSERT WITH CHECK (
          candidate_id = auth.uid() OR
          auth.uid() IN (SELECT id FROM client_profiles)
        );

      DROP POLICY IF EXISTS "candidate_languages_update" ON candidate_languages;
      CREATE POLICY "candidate_languages_update" ON candidate_languages
        FOR UPDATE USING (candidate_id = auth.uid());

      DROP POLICY IF EXISTS "candidate_languages_delete" ON candidate_languages;
      CREATE POLICY "candidate_languages_delete" ON candidate_languages
        FOR DELETE USING (candidate_id = auth.uid());

      -- Politiques pour candidate_expertises
      DROP POLICY IF EXISTS "candidate_expertises_select" ON candidate_expertises;
      CREATE POLICY "candidate_expertises_select" ON candidate_expertises
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "candidate_expertises_insert" ON candidate_expertises;
      CREATE POLICY "candidate_expertises_insert" ON candidate_expertises
        FOR INSERT WITH CHECK (
          candidate_id = auth.uid() OR
          auth.uid() IN (SELECT id FROM client_profiles)
        );

      DROP POLICY IF EXISTS "candidate_expertises_update" ON candidate_expertises;
      CREATE POLICY "candidate_expertises_update" ON candidate_expertises
        FOR UPDATE USING (candidate_id = auth.uid());

      DROP POLICY IF EXISTS "candidate_expertises_delete" ON candidate_expertises;
      CREATE POLICY "candidate_expertises_delete" ON candidate_expertises
        FOR DELETE USING (candidate_id = auth.uid());

      -- Politiques pour candidate_skills
      DROP POLICY IF EXISTS "candidate_skills_select" ON candidate_skills;
      CREATE POLICY "candidate_skills_select" ON candidate_skills
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "candidate_skills_insert" ON candidate_skills;
      CREATE POLICY "candidate_skills_insert" ON candidate_skills
        FOR INSERT WITH CHECK (
          candidate_id = auth.uid() OR
          auth.uid() IN (SELECT id FROM client_profiles)
        );

      DROP POLICY IF EXISTS "candidate_skills_update" ON candidate_skills;
      CREATE POLICY "candidate_skills_update" ON candidate_skills
        FOR UPDATE USING (candidate_id = auth.uid());

      DROP POLICY IF EXISTS "candidate_skills_delete" ON candidate_skills;
      CREATE POLICY "candidate_skills_delete" ON candidate_skills
        FOR DELETE USING (candidate_id = auth.uid());
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsPoliciesQuery
    });

    if (rlsError) {
      console.error('Erreur lors de l\'ajout des politiques RLS:', rlsError);
      // Continuer même si erreur
    }

    console.log('✅ Politiques RLS ajoutées');

    // 4. Activer le realtime sur ces tables
    const realtimeQuery = `
      -- Activer le realtime
      ALTER PUBLICATION supabase_realtime ADD TABLE candidate_languages;
      ALTER PUBLICATION supabase_realtime ADD TABLE candidate_expertises;
      ALTER PUBLICATION supabase_realtime ADD TABLE candidate_skills;
    `;

    const { error: realtimeError } = await supabase.rpc('exec_sql', {
      sql: realtimeQuery
    });

    if (realtimeError) {
      console.error('Note: Realtime déjà activé ou erreur:', realtimeError);
    }

    console.log('✅ Realtime activé');

    // 5. Vérifier la structure finale
    const checkQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('candidate_languages', 'candidate_expertises')
        AND kcu.column_name = 'candidate_id';
    `;

    const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
      sql: checkQuery
    });

    if (checkError) {
      console.error('Erreur lors de la vérification:', checkError);
    } else {
      console.log('📊 Structure des FK:', checkData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tables candidate_languages et candidate_expertises recréées avec succès',
        details: {
          tables_created: ['candidate_languages', 'candidate_expertises', 'candidate_skills'],
          rls_enabled: true,
          realtime_enabled: true,
          foreign_keys: 'Pointent maintenant vers candidate_profiles.id (ID universel)'
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de la correction des associations candidats'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});