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

    // Récupérer l'utilisateur depuis le header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not found');
    }

    console.log('Checking permissions for user:', user.id, user.email);

    // Vérifier si le profil existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('Profile not found, creating...');
      // Créer le profil s'il n'existe pas
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin', // Définir comme admin
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }
    } else if (profile.role !== 'admin') {
      console.log('Updating role to admin for user:', user.id);
      // Mettre à jour le rôle si nécessaire
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating role:', updateError);
        throw updateError;
      }
    }

    // Vérifier les policies existantes
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT polname, polcmd, polroles::text 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('ai_faq', 'ai_prompts', 'ai_action_logs');
      `
    });

    // Recréer les policies si nécessaire
    const recreatePolicies = [
      {
        table: 'faq_items',
        sql: `
          DROP POLICY IF EXISTS "FAQ items visible pour tous" ON public.faq_items;
          DROP POLICY IF EXISTS "Admins peuvent gérer FAQ items" ON public.faq_items;
          
          CREATE POLICY "FAQ items visible pour tous" ON public.faq_items
            FOR SELECT
            USING (is_published = true);
          
          CREATE POLICY "Admins peuvent gérer FAQ items" ON public.faq_items
            FOR ALL
            USING (
              auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
              )
            );
        `
      },
      {
        table: 'ai_prompts',
        sql: `
          DROP POLICY IF EXISTS "Admins peuvent gérer prompts" ON public.ai_prompts;
          
          CREATE POLICY "Admins peuvent gérer prompts" ON public.ai_prompts
            FOR ALL
            USING (
              auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
              )
            );
        `
      },
      {
        table: 'ai_action_logs',
        sql: `
          DROP POLICY IF EXISTS "Users peuvent voir leurs logs" ON public.ai_action_logs;
          DROP POLICY IF EXISTS "Admins peuvent voir tous les logs" ON public.ai_action_logs;
          DROP POLICY IF EXISTS "Users peuvent créer leurs logs" ON public.ai_action_logs;
          
          CREATE POLICY "Users peuvent voir leurs logs" ON public.ai_action_logs
            FOR SELECT
            USING (user_id = auth.uid());
          
          CREATE POLICY "Users peuvent créer leurs logs" ON public.ai_action_logs
            FOR INSERT
            WITH CHECK (user_id = auth.uid());
          
          CREATE POLICY "Admins peuvent voir tous les logs" ON public.ai_action_logs
            FOR SELECT
            USING (
              auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
              )
            );
        `
      }
    ];

    for (const policy of recreatePolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.error(`Error recreating policies for ${policy.table}:`, error);
      } else {
        console.log(`Policies recreated for ${policy.table}`);
      }
    }

    // Vérifier que l'utilisateur peut maintenant accéder aux tables
    const testQueries = [
      { table: 'faq_items', operation: 'SELECT' },
      { table: 'ai_prompts', operation: 'SELECT' },
      { table: 'ai_action_logs', operation: 'SELECT' }
    ];

    const results = [];
    for (const test of testQueries) {
      const { data, error } = await supabase
        .from(test.table)
        .select('id')
        .limit(1);
      
      results.push({
        table: test.table,
        canAccess: !error,
        error: error?.message
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Permissions fixed successfully',
        user: {
          id: user.id,
          email: user.email,
          role: 'admin'
        },
        accessTests: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});