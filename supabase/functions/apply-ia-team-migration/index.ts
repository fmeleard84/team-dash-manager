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

    console.log('🚀 Début de la migration IA Team...');

    // 1. Ajouter la colonne prompt_id à hr_profiles
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.hr_profiles
        ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;
      `
    });

    if (alterError) {
      console.error('Erreur ajout colonne prompt_id:', alterError);
    } else {
      console.log('✅ Colonne prompt_id ajoutée à hr_profiles');
    }

    // 2. Créer la table ia_resource_prompts
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
          prompt_id UUID NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
          is_primary BOOLEAN DEFAULT true,
          context VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(profile_id, prompt_id)
        );
      `
    });

    if (createTableError) {
      console.error('Erreur création table ia_resource_prompts:', createTableError);
    } else {
      console.log('✅ Table ia_resource_prompts créée');
    }

    // 3. Créer les index
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_ia_resource_prompts_profile ON public.ia_resource_prompts(profile_id);`,
      `CREATE INDEX IF NOT EXISTS idx_ia_resource_prompts_prompt ON public.ia_resource_prompts(prompt_id);`,
      `CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);`
    ];

    for (const query of indexQueries) {
      await supabase.rpc('exec_sql', { sql: query });
    }
    console.log('✅ Index créés');

    // 4. Insérer les prompts IA de base
    const prompts = [
      {
        name: 'IA Rédacteur',
        context: 'ia_writer',
        prompt: 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet. Tu utilises un ton professionnel et tu structures toujours tes livrables avec des titres, sous-titres et sections bien définies.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Chef de Projet',
        context: 'ia_project_manager',
        prompt: 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings, des roadmaps, des rapports d\'avancement et tu aides à coordonner les équipes. Tu es méthodique, structuré et orienté résultats.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Développeur',
        context: 'ia_developer',
        prompt: 'Tu es un développeur IA qui aide à concevoir des architectures techniques, écrire de la documentation technique, proposer des solutions et réviser du code. Tu es précis, technique et tu fournis toujours des exemples concrets.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Designer',
        context: 'ia_designer',
        prompt: 'Tu es un designer IA qui aide à créer des concepts visuels, des maquettes, des chartes graphiques et des guidelines UX/UI. Tu es créatif, orienté utilisateur et tu fournis des descriptions détaillées de tes propositions visuelles.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Analyste',
        context: 'ia_analyst',
        prompt: 'Tu es un analyste IA qui aide à analyser des données, créer des rapports, identifier des tendances et proposer des recommandations stratégiques. Tu es analytique, factuel et tu bases toujours tes conclusions sur des données concrètes.',
        active: true,
        priority: 100
      }
    ];

    for (const prompt of prompts) {
      const { error: insertError } = await supabase
        .from('prompts_ia')
        .upsert(prompt, { onConflict: 'name' });

      if (insertError) {
        console.error(`Erreur insertion prompt ${prompt.name}:`, insertError);
      }
    }
    console.log('✅ Prompts IA de base insérés');

    // 5. Configurer les politiques RLS
    const rlsPolicies = [
      `ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_select_policy" ON public.ia_resource_prompts FOR SELECT USING (true);`,
      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_insert_policy" ON public.ia_resource_prompts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,
      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_update_policy" ON public.ia_resource_prompts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,
      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_delete_policy" ON public.ia_resource_prompts FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`
    ];

    for (const policy of rlsPolicies) {
      await supabase.rpc('exec_sql', { sql: policy });
    }
    console.log('✅ Politiques RLS configurées');

    // 6. Créer la fonction pour récupérer le prompt d'une ressource IA
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_ia_resource_prompt(resource_id UUID)
        RETURNS TABLE (
          prompt_id UUID,
          prompt_name TEXT,
          prompt_content TEXT,
          prompt_context TEXT
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT
            p.id as prompt_id,
            p.name as prompt_name,
            p.prompt as prompt_content,
            p.context as prompt_context
          FROM public.hr_profiles hp
          LEFT JOIN public.prompts_ia p ON hp.prompt_id = p.id
          WHERE hp.id = resource_id
            AND hp.is_ai = true
            AND p.active = true
          LIMIT 1;
        END;
        $$;
      `
    });

    if (funcError) {
      console.error('Erreur création fonction get_ia_resource_prompt:', funcError);
    } else {
      console.log('✅ Fonction get_ia_resource_prompt créée');
    }

    console.log('🎉 Migration IA Team terminée avec succès !');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration IA Team appliquée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Erreur migration:', error);
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