import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    console.log('🔍 Vérification de la migration IA Team...');

    const results = {
      columnExists: false,
      tableExists: false,
      promptsCount: 0,
      canInsertPrompts: false,
      tableRecords: 0
    };

    // 1. Test direct : essayer de sélectionner la colonne prompt_id
    try {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('id, prompt_id')
        .limit(1);

      if (!error) {
        results.columnExists = true;
        console.log('✅ Colonne prompt_id existe');
      } else {
        console.log('❌ Colonne prompt_id n\'existe pas:', error.message);
      }
    } catch (e) {
      console.log('❌ Erreur test colonne:', e);
    }

    // 2. Test direct : essayer de sélectionner dans ia_resource_prompts
    try {
      const { data, error } = await supabase
        .from('ia_resource_prompts')
        .select('*')
        .limit(1);

      if (!error) {
        results.tableExists = true;
        results.tableRecords = data?.length || 0;
        console.log('✅ Table ia_resource_prompts existe');
      } else {
        console.log('❌ Table ia_resource_prompts n\'existe pas:', error.message);
      }
    } catch (e) {
      console.log('❌ Erreur test table:', e);
    }

    // 3. Vérifier les prompts IA
    try {
      const { data, error } = await supabase
        .from('prompts_ia')
        .select('id, name, context')
        .in('context', ['ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst']);

      if (!error && data) {
        results.promptsCount = data.length;
        console.log(`✅ ${data.length} prompts IA trouvés`);
        data.forEach(p => console.log(`   - ${p.name} (${p.context})`));
      }
    } catch (e) {
      console.log('❌ Erreur lecture prompts:', e);
    }

    // 4. Test d'insertion dans ia_resource_prompts (si la table existe)
    if (results.tableExists && results.promptsCount > 0) {
      try {
        // Créer une entrée de test (on la supprimera après)
        const testId = 'test-' + Date.now();
        const { error } = await supabase
          .from('ia_resource_prompts')
          .insert({
            profile_id: 'f6005986-2af1-48c7-bcb5-8a2e0d952bb6', // Un ID de profil existant
            prompt_id: (await supabase.from('prompts_ia').select('id').limit(1).single()).data?.id,
            is_primary: true,
            context: 'test'
          });

        if (!error) {
          results.canInsertPrompts = true;
          console.log('✅ Insertion test réussie');

          // Supprimer l'entrée de test
          await supabase
            .from('ia_resource_prompts')
            .delete()
            .eq('context', 'test');
        } else {
          console.log('❌ Impossible d\'insérer dans ia_resource_prompts:', error.message);
        }
      } catch (e) {
        console.log('❌ Erreur test insertion:', e);
      }
    }

    // Résumé
    const isFullyMigrated = results.columnExists && results.tableExists && results.promptsCount >= 5;

    return new Response(
      JSON.stringify({
        success: true,
        fullyMigrated: isFullyMigrated,
        details: results,
        message: isFullyMigrated
          ? '🎉 Migration complètement appliquée !'
          : '⚠️ Migration partiellement appliquée',
        recommendations: !isFullyMigrated ? [
          !results.columnExists && 'Exécuter ALTER TABLE pour ajouter prompt_id',
          !results.tableExists && 'Créer la table ia_resource_prompts',
          results.promptsCount < 5 && 'Insérer les prompts IA de base'
        ].filter(Boolean) : []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});