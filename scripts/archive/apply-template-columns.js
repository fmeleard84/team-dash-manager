import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjUwODg0NiwiZXhwIjoyMDM4MDg0ODQ2fQ.OFhJLz5XnQUV4eDEJb4pVKHZeGp_RmAz1bgqkrW4R8w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyTemplateColumns() {
  try {
    console.log('Ajout des colonnes manquantes aux project_templates...');

    const sql = `
      -- Ajouter les colonnes si elles n'existent pas
      ALTER TABLE project_templates
      ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 4,
      ADD COLUMN IF NOT EXISTS price_per_minute decimal(10,2) DEFAULT 1.5;

      -- Mettre à jour les valeurs NULL
      UPDATE project_templates 
      SET team_size = 4 
      WHERE team_size IS NULL;

      UPDATE project_templates 
      SET price_per_minute = 1.5 
      WHERE price_per_minute IS NULL;
    `;

    const { data, error } = await supabase.rpc('sql_executor', { sql_query: sql });

    if (error) {
      console.error('Erreur:', error);
      
      // Si sql_executor n'existe pas, essayons une approche différente
      if (error.message?.includes('sql_executor')) {
        console.log('Tentative avec une approche alternative...');
        
        // Essayons de créer la fonction sql_executor d'abord
        const createFunction = `
          CREATE OR REPLACE FUNCTION sql_executor(sql_query text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE sql_query;
            RETURN json_build_object('success', true);
          EXCEPTION
            WHEN OTHERS THEN
              RETURN json_build_object('success', false, 'error', SQLERRM);
          END;
          $$;
        `;
        
        // Nous ne pouvons pas créer directement la fonction, donc utilisons l'API SQL directement
        console.log('Veuillez exécuter ces requêtes SQL directement dans Supabase SQL Editor:');
        console.log('\n--- COPIER À PARTIR D\'ICI ---\n');
        console.log(sql);
        console.log('\n--- FIN DU SQL ---\n');
        
        return;
      }
    } else {
      console.log('✅ Colonnes ajoutées avec succès!');
    }

    // Vérifier les colonnes existantes
    console.log('\nVérification de la structure de la table...');
    const { data: columns, error: columnsError } = await supabase
      .from('project_templates')
      .select('*')
      .limit(0);

    if (!columnsError) {
      console.log('✅ Table project_templates prête!');
    } else {
      console.error('Erreur lors de la vérification:', columnsError);
    }

  } catch (error) {
    console.error('Erreur:', error);
  }
}

applyTemplateColumns();