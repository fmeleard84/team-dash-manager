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

    console.log('Ajout de la colonne reactflow_data à la table projects...');

    // Vérifier si la colonne existe déjà
    const { data: columns, error: checkError } = await supabase
      .from('projects')
      .select('*')
      .limit(0);

    // Si on peut lire la table, vérifier si reactflow_data existe
    if (!checkError) {
      // Récupérer un projet pour voir ses colonnes
      const { data: sample } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
        .single();

      if (sample && !sample.hasOwnProperty('reactflow_data')) {
        console.log('La colonne reactflow_data n\'existe pas, création...');
        
        // Exécuter la requête SQL pour ajouter la colonne
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS reactflow_data JSONB DEFAULT NULL;
          `
        });

        if (error) {
          console.error('Erreur lors de l\'ajout de la colonne:', error);
          
          // Si exec_sql n'existe pas, créer la fonction
          if (error.message?.includes('function') || error.message?.includes('does not exist')) {
            const { error: createFuncError } = await supabase.rpc('exec_sql_v2', {
              query: `
                CREATE OR REPLACE FUNCTION exec_sql(sql text)
                RETURNS void
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                  EXECUTE sql;
                END;
                $$;
              `
            });

            if (createFuncError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Impossible de créer la fonction exec_sql. Veuillez exécuter manuellement: ALTER TABLE projects ADD COLUMN reactflow_data JSONB DEFAULT NULL;',
                  manual_sql: 'ALTER TABLE projects ADD COLUMN reactflow_data JSONB DEFAULT NULL;'
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 400
                }
              );
            }

            // Réessayer avec la nouvelle fonction
            const { error: retryError } = await supabase.rpc('exec_sql', {
              sql: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS reactflow_data JSONB DEFAULT NULL;`
            });

            if (retryError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Erreur lors de l\'ajout de la colonne',
                  details: retryError
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 400
                }
              );
            }
          }
        }

        console.log('Colonne reactflow_data ajoutée avec succès');
      } else {
        console.log('La colonne reactflow_data existe déjà');
      }
    }

    // Vérifier le résultat
    const { data: finalCheck } = await supabase
      .from('projects')
      .select('id, title, reactflow_data')
      .limit(1);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Colonne reactflow_data vérifiée/ajoutée',
        has_column: finalCheck?.[0]?.hasOwnProperty('reactflow_data') ?? false,
        sample: finalCheck?.[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        manual_sql: 'ALTER TABLE projects ADD COLUMN reactflow_data JSONB DEFAULT NULL;'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});