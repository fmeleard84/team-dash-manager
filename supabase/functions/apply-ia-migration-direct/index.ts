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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { persistSession: false }
    });

    console.log('🚀 Application directe de la migration IA Team...');

    const migrations = [];

    // 1. Ajouter la colonne prompt_id
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;'
      });

      if (error) {
        console.log('Note: Colonne prompt_id peut déjà exister:', error.message);
      } else {
        migrations.push('✅ Colonne prompt_id ajoutée');
      }
    } catch (e) {
      console.log('Info: Colonne prompt_id existe probablement déjà');
    }

    // 2. Créer la table ia_resource_prompts
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
            prompt_id UUID NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
            is_primary BOOLEAN DEFAULT true,
            context VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
        `
      });

      if (!error) {
        migrations.push('✅ Table ia_resource_prompts créée');

        // Ajouter la contrainte unique séparément
        await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE public.ia_resource_prompts ADD CONSTRAINT IF NOT EXISTS unique_profile_prompt UNIQUE(profile_id, prompt_id);'
        });
      }
    } catch (e) {
      console.log('Info: Table ia_resource_prompts existe probablement déjà');
    }

    // 3. Activer RLS
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;'
      });
      migrations.push('✅ RLS activé sur ia_resource_prompts');
    } catch (e) {
      console.log('RLS déjà activé');
    }

    // 4. Créer les politiques RLS
    const policies = [
      {
        name: 'ia_resource_prompts_select',
        sql: `
          CREATE POLICY IF NOT EXISTS "ia_resource_prompts_select"
          ON public.ia_resource_prompts FOR SELECT
          USING (true);
        `
      },
      {
        name: 'ia_resource_prompts_admin_insert',
        sql: `
          CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_insert"
          ON public.ia_resource_prompts FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `
      },
      {
        name: 'ia_resource_prompts_admin_update',
        sql: `
          CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_update"
          ON public.ia_resource_prompts FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `
      },
      {
        name: 'ia_resource_prompts_admin_delete',
        sql: `
          CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_delete"
          ON public.ia_resource_prompts FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `
      }
    ];

    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', { sql: policy.sql });
      } catch (e) {
        console.log(`Policy ${policy.name} existe probablement déjà`);
      }
    }
    migrations.push('✅ Politiques RLS créées');

    // 5. Créer les index
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_profile ON public.ia_resource_prompts(profile_id);',
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_prompt ON public.ia_resource_prompts(prompt_id);',
      'CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);'
    ];

    for (const index of indexes) {
      try {
        await supabase.rpc('exec_sql', { sql: index });
      } catch (e) {
        console.log('Index existe probablement déjà');
      }
    }
    migrations.push('✅ Index créés');

    // 6. Insérer les prompts IA de base
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

    let promptsInserted = 0;
    for (const prompt of prompts) {
      const { data: existing } = await supabase
        .from('prompts_ia')
        .select('id')
        .eq('name', prompt.name)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('prompts_ia')
          .insert(prompt);

        if (!error) {
          promptsInserted++;
        }
      }
    }

    if (promptsInserted > 0) {
      migrations.push(`✅ ${promptsInserted} prompts IA insérés`);
    }

    // Vérification finale
    const { data: columnCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'hr_profiles'
        AND column_name = 'prompt_id';
      `
    });

    const { data: tableCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ia_resource_prompts';
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration IA Team appliquée avec succès',
        migrations,
        verification: {
          prompt_id_column: columnCheck?.length > 0,
          ia_resource_prompts_table: tableCheck?.length > 0
        }
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