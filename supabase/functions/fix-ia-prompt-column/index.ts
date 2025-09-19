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

    console.log('🔧 Vérification et ajout de la colonne prompt_id...');

    // 1. Vérifier si la colonne existe déjà
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'hr_profiles')
      .eq('column_name', 'prompt_id');

    if (columnsError) {
      console.error('Erreur lors de la vérification:', columnsError);
    }

    let columnExists = columns && columns.length > 0;
    console.log('Colonne prompt_id existe:', columnExists);

    if (!columnExists) {
      // 2. Ajouter la colonne prompt_id
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `ALTER TABLE public.hr_profiles ADD COLUMN prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;`
        })
        .single();

      if (error) {
        console.error('Erreur ajout colonne:', error);
        throw error;
      }

      console.log('✅ Colonne prompt_id ajoutée avec succès');
    } else {
      console.log('ℹ️ Colonne prompt_id existe déjà');
    }

    // 3. Vérifier la table ia_resource_prompts
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'ia_resource_prompts');

    if (!tableExists || tableExists.length === 0) {
      console.log('Création de la table ia_resource_prompts...');

      const { error: createError } = await supabase.rpc('exec_sql', {
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

      if (createError) {
        console.error('Erreur création table:', createError);
      } else {
        console.log('✅ Table ia_resource_prompts créée');
      }
    }

    // 4. Vérifier et créer les prompts IA de base
    const { data: existingPrompts, error: promptsError } = await supabase
      .from('prompts_ia')
      .select('context')
      .in('context', ['ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst']);

    const existingContexts = existingPrompts?.map(p => p.context) || [];

    const prompts = [
      {
        name: 'IA Rédacteur',
        context: 'ia_writer',
        prompt: 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Chef de Projet',
        context: 'ia_project_manager',
        prompt: 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings et rapports d\'avancement.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Développeur',
        context: 'ia_developer',
        prompt: 'Tu es un développeur IA qui aide à concevoir des architectures techniques et écrire de la documentation technique.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Designer',
        context: 'ia_designer',
        prompt: 'Tu es un designer IA qui aide à créer des concepts visuels et des guidelines UX/UI.',
        active: true,
        priority: 100
      },
      {
        name: 'IA Analyste',
        context: 'ia_analyst',
        prompt: 'Tu es un analyste IA qui aide à analyser des données et créer des rapports.',
        active: true,
        priority: 100
      }
    ];

    for (const prompt of prompts) {
      if (!existingContexts.includes(prompt.context)) {
        const { error: insertError } = await supabase
          .from('prompts_ia')
          .insert(prompt);

        if (insertError) {
          console.error(`Erreur insertion prompt ${prompt.name}:`, insertError);
        } else {
          console.log(`✅ Prompt ${prompt.name} inséré`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Configuration IA corrigée avec succès',
        details: {
          prompt_id_column: !columnExists ? 'added' : 'already exists',
          ia_resource_prompts_table: !tableExists || tableExists.length === 0 ? 'created' : 'already exists'
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