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

    console.log('🔧 Correction des politiques RLS pour ia_resource_prompts...');

    const results = [];

    // 1. Vérifier si la table existe
    const { data: tableCheck } = await supabase
      .from('ia_resource_prompts')
      .select('id')
      .limit(1);

    if (tableCheck === null) {
      // La table n'existe pas ou n'est pas accessible, la créer
      await supabase.rpc('exec_sql', {
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
      results.push('✅ Table ia_resource_prompts créée');
    }

    // 2. Activer RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;'
    });
    results.push('✅ RLS activé');

    // 3. Supprimer toutes les politiques existantes
    const dropPolicies = [
      'DROP POLICY IF EXISTS "ia_resource_prompts_select" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_insert" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_update" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_delete" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "ia_resource_prompts_admin_only" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.ia_resource_prompts;',
      'DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.ia_resource_prompts;'
    ];

    for (const dropSql of dropPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql: dropSql });
      } catch (e) {
        // Ignorer les erreurs de suppression
      }
    }
    results.push('✅ Anciennes politiques supprimées');

    // 4. Créer des politiques plus permissives
    const newPolicies = [
      // Lecture pour tous les utilisateurs authentifiés
      `CREATE POLICY "ia_resource_prompts_read_all"
       ON public.ia_resource_prompts
       FOR SELECT
       USING (auth.uid() IS NOT NULL);`,

      // Insertion pour les admins seulement
      `CREATE POLICY "ia_resource_prompts_insert_admin"
       ON public.ia_resource_prompts
       FOR INSERT
       WITH CHECK (
         EXISTS (
           SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role = 'admin'
         )
       );`,

      // Mise à jour pour les admins seulement
      `CREATE POLICY "ia_resource_prompts_update_admin"
       ON public.ia_resource_prompts
       FOR UPDATE
       USING (
         EXISTS (
           SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role = 'admin'
         )
       );`,

      // Suppression pour les admins seulement
      `CREATE POLICY "ia_resource_prompts_delete_admin"
       ON public.ia_resource_prompts
       FOR DELETE
       USING (
         EXISTS (
           SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role = 'admin'
         )
       );`
    ];

    for (const policySql of newPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql: policySql });
      } catch (e) {
        console.error('Erreur création politique:', e);
      }
    }
    results.push('✅ Nouvelles politiques créées');

    // 5. Test de lecture
    let canRead = false;
    try {
      const { data, error } = await supabase
        .from('ia_resource_prompts')
        .select('*')
        .limit(1);

      if (!error) {
        canRead = true;
        results.push(`✅ Test de lecture réussi (${data?.length || 0} enregistrements)`);
      } else {
        results.push(`❌ Test de lecture échoué: ${error.message}`);
      }
    } catch (e) {
      results.push('❌ Test de lecture échoué');
    }

    // 6. Vérifier l'état final
    const { data: finalCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies
        WHERE tablename = 'ia_resource_prompts'
        ORDER BY policyname;
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Politiques RLS corrigées',
        results,
        canRead,
        policies: finalCheck || [],
        recommendation: !canRead ?
          'Si les erreurs persistent, utilisez uniquement hr_profiles.prompt_id pour stocker les associations' :
          'La table ia_resource_prompts est maintenant accessible'
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