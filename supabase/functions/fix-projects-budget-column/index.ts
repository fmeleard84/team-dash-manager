import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Vérification de la structure de la table projects...');

    // 1. Vérifier si la colonne budget existe
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { 
        schema_name: 'public',
        table_name: 'projects'
      })
      .select('*');

    if (columnsError) {
      // Si la fonction n'existe pas, créons-la
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION get_table_columns(schema_name text, table_name text)
        RETURNS TABLE (
          column_name text,
          data_type text,
          is_nullable text
        )
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT 
            column_name::text,
            data_type::text,
            is_nullable::text
          FROM information_schema.columns
          WHERE table_schema = schema_name
            AND table_name = get_table_columns.table_name
          ORDER BY ordinal_position;
        $$;
      `;

      const { error: createFuncError } = await supabase.rpc('exec_sql', {
        sql: createFunctionSQL
      });

      if (createFuncError) {
        // Exécuter directement la requête
        const directSQL = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'projects'
          ORDER BY ordinal_position;
        `;

        const { data: directColumns, error: directError } = await supabase
          .from('projects')
          .select('*')
          .limit(0);

        console.log('Colonnes disponibles:', Object.keys(directColumns?.[0] || {}));
      }
    }

    // 2. Ajouter la colonne budget si elle n'existe pas
    const alterTableSQL = `
      DO $$
      BEGIN
        -- Ajouter la colonne budget si elle n'existe pas
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'projects' 
          AND column_name = 'budget'
        ) THEN
          ALTER TABLE projects ADD COLUMN budget INTEGER DEFAULT 0;
          RAISE NOTICE 'Colonne budget ajoutée à la table projects';
        ELSE
          RAISE NOTICE 'La colonne budget existe déjà';
        END IF;
      END $$;
    `;

    // Exécuter via une fonction SQL
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: alterTableSQL
    });

    if (alterError) {
      console.error('Erreur lors de l\'ajout de la colonne:', alterError);
      
      // Essayer une approche directe
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('budget')
          .limit(1);
        
        if (error?.message?.includes('column "budget" does not exist')) {
          // La colonne n'existe vraiment pas, on doit la créer
          return new Response(
            JSON.stringify({
              success: false,
              error: 'La colonne budget n\'existe pas. Veuillez exécuter la migration SQL directement.',
              migration: `ALTER TABLE projects ADD COLUMN budget INTEGER DEFAULT 0;`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Erreur vérification:', e);
      }
    }

    // 3. Vérifier et corriger les RLS pour ai_action_logs
    const rlsPoliciesSQL = `
      DO $$
      BEGIN
        -- Supprimer les anciennes policies
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_action_logs;
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON ai_action_logs;
        
        -- Créer les nouvelles policies
        CREATE POLICY "Enable insert for authenticated users" 
        ON ai_action_logs FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
        
        CREATE POLICY "Enable read for authenticated users" 
        ON ai_action_logs FOR SELECT 
        TO authenticated 
        USING (user_id = auth.uid());
        
        -- Activer RLS
        ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'RLS policies pour ai_action_logs mises à jour';
      END $$;
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsPoliciesSQL
    });

    if (rlsError) {
      console.error('Erreur RLS:', rlsError);
    }

    // 4. Créer la fonction exec_sql si elle n'existe pas
    const createExecSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;

    const { data: execResult, error: execError } = await supabase
      .from('projects')
      .select('id, name, budget')
      .limit(1);

    console.log('Test de lecture:', execResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vérifications et corrections appliquées',
        hasbudget: execResult?.[0]?.hasOwnProperty('budget') ?? false,
        sample: execResult?.[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});