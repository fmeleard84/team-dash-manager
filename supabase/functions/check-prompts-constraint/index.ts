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

    console.log('🔍 Vérification des contraintes sur prompts_ia...');

    // 1. Récupérer les informations sur la contrainte
    const { data: constraintInfo, error: constraintError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            conname as constraint_name,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = 'prompts_ia'::regclass
          AND contype = 'c';
        `
      });

    console.log('Contraintes trouvées:', constraintInfo);

    // 2. Récupérer les valeurs existantes de context
    const { data: existingContexts, error: contextError } = await supabase
      .from('prompts_ia')
      .select('context')
      .order('context');

    const uniqueContexts = [...new Set(existingContexts?.map(p => p.context) || [])];
    console.log('Contextes existants:', uniqueContexts);

    // 3. Essayer de créer des prompts avec différents contextes
    const testContexts = [
      'general',
      'behavior',
      'team-composition',
      'project-management',
      'technical',
      'meeting',
      'task-management'
    ];

    const validContexts = [];
    for (const ctx of testContexts) {
      try {
        // Essayer d'insérer temporairement
        const testId = `test_${Date.now()}_${ctx}`;
        const { error } = await supabase
          .from('prompts_ia')
          .insert({
            id: testId,
            name: `Test ${ctx}`,
            context: ctx,
            prompt: 'Test prompt',
            active: false,
            priority: 0
          });

        if (!error) {
          validContexts.push(ctx);
          // Supprimer l'entrée de test
          await supabase
            .from('prompts_ia')
            .delete()
            .eq('id', testId);
        } else {
          console.log(`Context '${ctx}' invalide:`, error.message);
        }
      } catch (e) {
        console.log(`Context '${ctx}' rejeté`);
      }
    }

    // 4. Appliquer la migration adaptée
    const migrationResults = [];

    // Ajouter la colonne prompt_id
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS prompt_id TEXT REFERENCES public.prompts_ia(id) ON DELETE SET NULL;'
      });
      if (!error) {
        migrationResults.push('✅ Colonne prompt_id ajoutée');
      }
    } catch (e) {
      console.log('Colonne prompt_id existe déjà');
    }

    // Créer la table ia_resource_prompts
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
            prompt_id TEXT NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
            is_primary BOOLEAN DEFAULT true,
            context VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(profile_id, prompt_id)
          );
        `
      });
      if (!error) {
        migrationResults.push('✅ Table ia_resource_prompts créée');
      }
    } catch (e) {
      console.log('Table existe déjà');
    }

    // Activer RLS
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;'
      });
      migrationResults.push('✅ RLS activé');
    } catch (e) {
      console.log('RLS déjà activé');
    }

    // Créer les politiques RLS
    const policies = [
      'DROP POLICY IF EXISTS "ia_resource_prompts_select" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_insert" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_update" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_delete" ON public.ia_resource_prompts;',
      `CREATE POLICY "ia_resource_prompts_select" ON public.ia_resource_prompts FOR SELECT USING (true);`,
      `CREATE POLICY "ia_resource_prompts_admin_insert" ON public.ia_resource_prompts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,
      `CREATE POLICY "ia_resource_prompts_admin_update" ON public.ia_resource_prompts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,
      `CREATE POLICY "ia_resource_prompts_admin_delete" ON public.ia_resource_prompts FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`
    ];

    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', { sql: policy });
      } catch (e) {
        // Ignore
      }
    }
    migrationResults.push('✅ Politiques RLS créées');

    // Créer les index
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_profile ON public.ia_resource_prompts(profile_id);',
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_prompt ON public.ia_resource_prompts(prompt_id);',
      'CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);'
    ];

    for (const index of indexes) {
      try {
        await supabase.rpc('exec_sql', { sql: index });
      } catch (e) {
        // Ignore
      }
    }
    migrationResults.push('✅ Index créés');

    // Insérer les prompts IA avec des contextes valides
    const iaPrompts = [
      {
        name: 'IA Rédacteur Général',
        context: validContexts.includes('general') ? 'general' : validContexts[0],
        prompt: 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet.',
      },
      {
        name: 'IA Chef de Projet',
        context: validContexts.includes('project-management') ? 'project-management' : validContexts.includes('general') ? 'general' : validContexts[0],
        prompt: 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings et rapports d\'avancement.',
      },
      {
        name: 'IA Développeur',
        context: validContexts.includes('technical') ? 'technical' : validContexts.includes('general') ? 'general' : validContexts[0],
        prompt: 'Tu es un développeur IA qui aide à concevoir des architectures techniques et écrire de la documentation technique.',
      },
      {
        name: 'IA Designer',
        context: validContexts.includes('general') ? 'general' : validContexts[0],
        prompt: 'Tu es un designer IA qui aide à créer des concepts visuels et des guidelines UX/UI.',
      },
      {
        name: 'IA Analyste',
        context: validContexts.includes('general') ? 'general' : validContexts[0],
        prompt: 'Tu es un analyste IA qui aide à analyser des données et créer des rapports.',
      }
    ];

    let promptsInserted = 0;
    for (const iaPrompt of iaPrompts) {
      const promptId = `ia_${iaPrompt.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

      const { error } = await supabase
        .from('prompts_ia')
        .insert({
          id: promptId,
          name: iaPrompt.name,
          context: iaPrompt.context,
          prompt: iaPrompt.prompt,
          active: true,
          priority: 100
        });

      if (!error) {
        promptsInserted++;
        console.log(`✅ Prompt créé: ${iaPrompt.name} (context: ${iaPrompt.context})`);
      } else {
        console.log(`❌ Erreur pour ${iaPrompt.name}:`, error.message);
      }
    }

    if (promptsInserted > 0) {
      migrationResults.push(`✅ ${promptsInserted} prompts IA créés`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration IA Team appliquée avec succès',
        constraintInfo,
        validContexts,
        existingContexts: uniqueContexts,
        migrationResults,
        promptsCreated: promptsInserted
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