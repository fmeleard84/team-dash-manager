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

    console.log('🚀 Création des prompts IA avec contextes et priorités valides...');

    // Vérifier les valeurs de priority existantes
    const { data: existingPriorities } = await supabase
      .from('prompts_ia')
      .select('priority')
      .order('priority');

    const priorities = [...new Set(existingPriorities?.map(p => p.priority) || [])];
    console.log('Priorités existantes:', priorities);

    // Utiliser une priorité valide (basée sur les existantes ou 1 par défaut)
    const defaultPriority = priorities.length > 0 ? priorities[0] : 1;

    const iaPrompts = [
      {
        id: `ia_writer_${Date.now()}_1`,
        name: 'IA Rédacteur',
        context: 'general',
        prompt: 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet. Tu utilises un ton professionnel et tu structures toujours tes livrables avec des titres, sous-titres et sections bien définies.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_pm_${Date.now()}_2`,
        name: 'IA Chef de Projet',
        context: 'project-management',
        prompt: 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings, des roadmaps, des rapports d\'avancement et tu aides à coordonner les équipes. Tu es méthodique, structuré et orienté résultats.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_dev_${Date.now()}_3`,
        name: 'IA Développeur',
        context: 'technical',
        prompt: 'Tu es un développeur IA qui aide à concevoir des architectures techniques, écrire de la documentation technique, proposer des solutions et réviser du code. Tu es précis, technique et tu fournis toujours des exemples concrets.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_designer_${Date.now()}_4`,
        name: 'IA Designer',
        context: 'general',
        prompt: 'Tu es un designer IA qui aide à créer des concepts visuels, des maquettes, des chartes graphiques et des guidelines UX/UI. Tu es créatif, orienté utilisateur et tu fournis des descriptions détaillées de tes propositions visuelles.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_analyst_${Date.now()}_5`,
        name: 'IA Analyste',
        context: 'general',
        prompt: 'Tu es un analyste IA qui aide à analyser des données, créer des rapports, identifier des tendances et proposer des recommandations stratégiques. Tu es analytique, factuel et tu bases toujours tes conclusions sur des données concrètes.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_team_${Date.now()}_6`,
        name: 'IA Assistant Équipe',
        context: 'team-composition',
        prompt: 'Tu es un assistant IA qui aide à composer et gérer les équipes. Tu analyses les compétences nécessaires, suggères les profils adaptés et facilites la collaboration entre les membres de l\'équipe.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_task_${Date.now()}_7`,
        name: 'IA Gestionnaire de Tâches',
        context: 'task-management',
        prompt: 'Tu es un gestionnaire de tâches IA qui aide à organiser, prioriser et suivre les tâches du projet. Tu crées des listes de tâches, définis les priorités et assures le suivi de l\'avancement.',
        active: true,
        priority: defaultPriority,
        variables: {}
      },
      {
        id: `ia_meeting_${Date.now()}_8`,
        name: 'IA Assistant Réunion',
        context: 'meeting',
        prompt: 'Tu es un assistant de réunion IA qui aide à préparer, animer et faire le suivi des réunions. Tu crées des ordres du jour, prends des notes et génères des comptes-rendus structurés.',
        active: true,
        priority: defaultPriority,
        variables: {}
      }
    ];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const iaPrompt of iaPrompts) {
      // Vérifier si le prompt existe déjà
      const { data: existing } = await supabase
        .from('prompts_ia')
        .select('id')
        .eq('name', iaPrompt.name)
        .single();

      if (existing) {
        results.push({
          name: iaPrompt.name,
          status: 'exists',
          id: existing.id
        });
        console.log(`ℹ️ Prompt "${iaPrompt.name}" existe déjà`);
      } else {
        const { data, error } = await supabase
          .from('prompts_ia')
          .insert(iaPrompt)
          .select()
          .single();

        if (error) {
          errorCount++;
          results.push({
            name: iaPrompt.name,
            status: 'error',
            error: error.message
          });
          console.error(`❌ Erreur pour "${iaPrompt.name}":`, error.message);
        } else {
          successCount++;
          results.push({
            name: iaPrompt.name,
            status: 'created',
            id: data.id,
            context: data.context,
            priority: data.priority
          });
          console.log(`✅ Prompt créé: "${iaPrompt.name}" (context: ${data.context}, priority: ${data.priority})`);
        }
      }
    }

    // Récupérer tous les prompts IA pour vérification
    const { data: allIAPrompts } = await supabase
      .from('prompts_ia')
      .select('id, name, context, priority, active')
      .order('name');

    // Vérifier l'état de la migration
    const { data: columnExists } = await supabase
      .from('hr_profiles')
      .select('prompt_id')
      .limit(1);

    const { data: tableExists } = await supabase
      .from('ia_resource_prompts')
      .select('id')
      .limit(1);

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Migration terminée: ${successCount} prompts créés, ${errorCount} erreurs`,
        details: {
          created: successCount,
          errors: errorCount,
          total: iaPrompts.length,
          defaultPriority: defaultPriority
        },
        results,
        allIAPrompts: allIAPrompts || [],
        migrationStatus: {
          hr_profiles_prompt_id: columnExists !== null,
          ia_resource_prompts_table: tableExists !== null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Erreur globale:', error);
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