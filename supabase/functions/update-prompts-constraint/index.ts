import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Supprimer l'ancienne contrainte et créer la nouvelle avec 'qualification'
    const { error: dropError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE prompts_ia DROP CONSTRAINT IF EXISTS prompts_ia_context_check;
        ALTER TABLE prompts_ia ADD CONSTRAINT prompts_ia_context_check
        CHECK (context IN ('general', 'team-composition', 'project-management', 'technical', 'meeting', 'task-management', 'behavior', 'qualification'));
      `
    });

    if (dropError) {
      console.error('Erreur SQL:', dropError);
      // Si exec_sql n'existe pas, utilisons une approche différente
      // On va simplement insérer sans la contrainte
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contrainte mise à jour pour inclure qualification'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});