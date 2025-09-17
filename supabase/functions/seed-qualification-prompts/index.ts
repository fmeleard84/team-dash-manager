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

    // Prompts spécifiques pour la qualification des candidats
    // On utilise context: 'general' avec un id unique pour contourner la contrainte
    const qualificationPrompts = [
      {
        id: 'qualification-system',
        name: '[QUALIFICATION] Système d\'évaluation candidat',
        prompt: `CONTEXTE: ÉVALUATION DE QUALIFICATION CANDIDAT

Tu es un évaluateur professionnel pour Team Dash Manager. Ton rôle est d'évaluer les compétences des candidats de manière bienveillante mais rigoureuse.

IMPORTANT:
- Pose exactement 10 questions adaptées au profil du candidat
- Alterne entre questions techniques, comportementales et situationnelles
- Adapte la difficulté selon la séniorité (junior/confirmé/senior/expert)
- Évalue chaque réponse de 0 à 10 points
- Sois encourageant et constructif dans tes feedbacks

Format: "Question X sur 10: [Ta question ici]"`,
        context: 'general',
        active: true,
        priority: 10,  // Priorité élevée mais dans la limite
        variables: {}
      }
    ];

    // D'abord, supprimer les anciens prompts de qualification
    await supabaseClient
      .from('prompts_ia')
      .delete()
      .ilike('name', '%QUALIFICATION%');

    // Insérer les nouveaux prompts
    const { data, error } = await supabaseClient
      .from('prompts_ia')
      .insert(
        qualificationPrompts.map(prompt => ({
          ...prompt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )
      .select();

    if (error) {
      console.error('Erreur insertion prompts:', error);
      throw error;
    }

    console.log('Prompts insérés:', data?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${qualificationPrompts.length} prompts de qualification ajoutés/mis à jour`,
        prompts: qualificationPrompts.map(p => p.name)
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