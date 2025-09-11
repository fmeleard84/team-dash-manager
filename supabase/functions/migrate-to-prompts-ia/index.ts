import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Nettoyer les tables en doublon
    console.log('Cleaning duplicate tables...');
    
    // 1. Supprimer ai_faq (on utilise faq_items)
    const { error: dropFaqError } = await supabase.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS ai_faq CASCADE;`
    });
    
    if (dropFaqError) {
      console.log('Could not drop ai_faq:', dropFaqError.message);
    }

    // 2. Supprimer ai_prompts (on utilise prompts_ia)
    const { error: dropPromptsError } = await supabase.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS ai_prompts CASCADE;`
    });
    
    if (dropPromptsError) {
      console.log('Could not drop ai_prompts:', dropPromptsError.message);
    }

    // 3. S'assurer que les bonnes RLS sont en place pour prompts_ia
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Activer RLS sur prompts_ia
        ALTER TABLE public.prompts_ia ENABLE ROW LEVEL SECURITY;

        -- Supprimer les anciennes policies si elles existent
        DROP POLICY IF EXISTS "prompts_ia_read_policy" ON public.prompts_ia;
        DROP POLICY IF EXISTS "prompts_ia_write_policy" ON public.prompts_ia;

        -- Policy pour lecture publique
        CREATE POLICY "prompts_ia_read_policy" ON public.prompts_ia
          FOR SELECT
          USING (auth.role() = 'authenticated');

        -- Policy pour les admins
        CREATE POLICY "prompts_ia_write_policy" ON public.prompts_ia
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() 
              AND role = 'admin'
            )
          );
      `
    });

    if (rlsError) {
      console.error('Error setting up RLS for prompts_ia:', rlsError);
    }

    // 4. Vérifier les tables restantes
    const { data: tables } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%faq%' OR table_name LIKE '%prompt%')
        ORDER BY table_name;
      `
    });

    console.log('Remaining tables:', tables);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Migration to prompts_ia completed, duplicate tables cleaned',
        remaining_tables: tables
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});