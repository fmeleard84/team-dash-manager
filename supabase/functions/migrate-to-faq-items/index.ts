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

    // 1. Migrer les données de ai_faq vers faq_items si nécessaire
    const { data: existingFaqs } = await supabase
      .from('ai_faq')
      .select('*');

    if (existingFaqs && existingFaqs.length > 0) {
      console.log(`Migrating ${existingFaqs.length} FAQs from ai_faq to faq_items`);
      
      for (const faq of existingFaqs) {
        // Vérifier si déjà migré
        const { data: existing } = await supabase
          .from('faq_items')
          .select('id')
          .eq('question', faq.question)
          .single();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('faq_items')
            .insert({
              question: faq.question,
              answer: faq.answer,
              category: faq.category,
              tags: faq.tags,
              is_published: faq.is_active,
              order_index: faq.order_index,
              created_at: faq.created_at,
              updated_at: faq.updated_at
            });

          if (insertError) {
            console.error('Error migrating FAQ:', insertError);
          }
        }
      }
    }

    // 2. Configurer les RLS pour faq_items
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Activer RLS sur faq_items
        ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

        -- Supprimer les anciennes policies si elles existent
        DROP POLICY IF EXISTS "FAQ items visible pour tous" ON public.faq_items;
        DROP POLICY IF EXISTS "Admins peuvent gérer FAQ items" ON public.faq_items;

        -- Policy pour lecture publique
        CREATE POLICY "FAQ items visible pour tous" ON public.faq_items
          FOR SELECT
          USING (is_published = true);

        -- Policy pour les admins
        CREATE POLICY "Admins peuvent gérer FAQ items" ON public.faq_items
          FOR ALL
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles WHERE role = 'admin'
            )
          );

        -- Créer les index si nécessaire
        CREATE INDEX IF NOT EXISTS idx_faq_items_published ON faq_items(is_published);
        CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
        CREATE INDEX IF NOT EXISTS idx_faq_items_order ON faq_items(order_index);
      `
    });

    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
    }

    // 3. Vérifier que l'utilisateur actuel est admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // S'assurer que l'utilisateur a un profil admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              role: 'admin',
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.error('Error updating user role:', updateError);
          } else {
            console.log('User role updated to admin');
          }
        }
      }
    }

    // 4. Récupérer les statistiques
    const { count: faqItemsCount } = await supabase
      .from('faq_items')
      .select('*', { count: 'exact', head: true });

    const { count: aiFaqCount } = await supabase
      .from('ai_faq')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Migration to faq_items completed',
        stats: {
          faq_items_count: faqItemsCount || 0,
          ai_faq_count: aiFaqCount || 0
        }
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