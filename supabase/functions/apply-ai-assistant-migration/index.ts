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

    // Créer les tables
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Table pour stocker les FAQ
        CREATE TABLE IF NOT EXISTS public.ai_faq (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          category VARCHAR(100),
          tags TEXT[],
          is_active BOOLEAN DEFAULT true,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          created_by UUID REFERENCES auth.users(id)
        );

        -- Table pour stocker les prompts de l'assistant
        CREATE TABLE IF NOT EXISTS public.ai_prompts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          priority INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          created_by UUID REFERENCES auth.users(id)
        );

        -- Table pour stocker l'historique des actions de l'assistant
        CREATE TABLE IF NOT EXISTS public.ai_action_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id),
          action_type VARCHAR(100) NOT NULL,
          action_data JSONB NOT NULL,
          result JSONB,
          status VARCHAR(50) DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Index
        CREATE INDEX IF NOT EXISTS idx_ai_faq_active ON public.ai_faq(is_active);
        CREATE INDEX IF NOT EXISTS idx_ai_faq_category ON public.ai_faq(category);
        CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON public.ai_prompts(is_active);
        CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON public.ai_prompts(type);
        CREATE INDEX IF NOT EXISTS idx_ai_action_logs_user ON public.ai_action_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_action_logs_status ON public.ai_action_logs(status);
      `
    });

    if (createError) {
      console.error('Error creating tables:', createError);
      throw createError;
    }

    // Activer RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.ai_faq ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;
      `
    });

    // Créer les policies
    const policies = [
      {
        table: 'ai_faq',
        name: 'FAQ visible pour tous',
        sql: `
          CREATE POLICY IF NOT EXISTS "FAQ visible pour tous" ON public.ai_faq
            FOR SELECT
            USING (is_active = true);
        `
      },
      {
        table: 'ai_faq',
        name: 'Admins peuvent gérer FAQ',
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins peuvent gérer FAQ" ON public.ai_faq
            FOR ALL
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
        table: 'ai_prompts',
        name: 'Admins peuvent gérer prompts',
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins peuvent gérer prompts" ON public.ai_prompts
            FOR ALL
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
        table: 'ai_action_logs',
        name: 'Users peuvent voir leurs logs',
        sql: `
          CREATE POLICY IF NOT EXISTS "Users peuvent voir leurs logs" ON public.ai_action_logs
            FOR SELECT
            USING (user_id = auth.uid());
        `
      },
      {
        table: 'ai_action_logs',
        name: 'Admins peuvent voir tous les logs',
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins peuvent voir tous les logs" ON public.ai_action_logs
            FOR SELECT
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
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.error(`Error creating policy ${policy.name}:`, error);
      }
    }

    // Créer les triggers pour updated_at
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = TIMEZONE('utc', NOW());
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_ai_faq_updated_at ON public.ai_faq;
        CREATE TRIGGER update_ai_faq_updated_at
          BEFORE UPDATE ON public.ai_faq
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON public.ai_prompts;
        CREATE TRIGGER update_ai_prompts_updated_at
          BEFORE UPDATE ON public.ai_prompts
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });

    // Insérer les données par défaut seulement si les tables sont vides
    const { count: faqCount } = await supabase
      .from('ai_faq')
      .select('*', { count: 'exact', head: true });

    if (faqCount === 0) {
      const { error: faqError } = await supabase
        .from('ai_faq')
        .insert([
          {
            question: 'Comment créer un nouveau projet ?',
            answer: 'Pour créer un nouveau projet, cliquez sur le bouton "Nouveau projet" dans votre tableau de bord, remplissez les informations requises (nom, description, dates, budget) et composez votre équipe via l\'interface ReactFlow.',
            category: 'Projets',
            tags: ['projet', 'création', 'nouveau'],
            order_index: 1
          },
          {
            question: 'Comment inviter des membres à mon équipe ?',
            answer: 'Utilisez l\'interface ReactFlow dans l\'onglet "Équipe" de votre projet. Glissez-déposez les profils professionnels souhaités, configurez leurs compétences et séniorité, puis lancez la recherche de candidats.',
            category: 'Équipe',
            tags: ['équipe', 'membres', 'invitation'],
            order_index: 2
          },
          {
            question: 'Comment planifier une réunion ?',
            answer: 'Accédez au Planning depuis le menu ou votre projet, cliquez sur une date pour créer un événement, définissez le type "Réunion", ajoutez les participants et configurez les rappels.',
            category: 'Planning',
            tags: ['réunion', 'planning', 'événement'],
            order_index: 3
          }
        ]);

      if (faqError) {
        console.error('Error inserting FAQ:', faqError);
      }
    }

    const { count: promptCount } = await supabase
      .from('ai_prompts')
      .select('*', { count: 'exact', head: true });

    if (promptCount === 0) {
      const { error: promptError } = await supabase
        .from('ai_prompts')
        .insert([
          {
            name: 'System Prompt',
            type: 'system',
            content: 'Tu es un assistant intelligent pour la plateforme Team Dash Manager. Tu aides les utilisateurs à gérer leurs projets, équipes et tâches de manière efficace.',
            priority: 1
          },
          {
            name: 'Context Général',
            type: 'context',
            content: 'Team Dash Manager est une plateforme de gestion de projets collaborative avec des outils comme ReactFlow pour la composition d\'équipes, Kanban pour les tâches, Planning pour les événements, Drive pour les fichiers et Wiki pour la documentation.',
            priority: 2
          },
          {
            name: 'Comportement',
            type: 'behavior',
            content: 'Sois professionnel mais amical. Réponds de manière concise et claire. Propose toujours des actions concrètes quand c\'est pertinent. Si tu ne connais pas la réponse, dis-le honnêtement.',
            priority: 3
          }
        ]);

      if (promptError) {
        console.error('Error inserting prompts:', promptError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Migration AI Assistant applied successfully'
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