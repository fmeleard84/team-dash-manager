import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Diagnostic des tables HR en production');

    // 1. Vérifier l'existence de hr_resource_assignments
    const { data: checkTable, error: checkError } = await supabase
      .rpc('to_regclass', { class_name: 'public.hr_resource_assignments' })
      .single();

    if (!checkTable || checkError) {
      console.log('⚠️ Table hr_resource_assignments n\'existe pas, création en cours...');

      // Créer la table hr_resource_assignments
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Créer la table hr_resource_assignments si elle n'existe pas
          CREATE TABLE IF NOT EXISTS public.hr_resource_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
            profile_id UUID REFERENCES public.hr_profiles(id),
            candidate_id UUID REFERENCES public.candidate_profiles(id),
            seniority TEXT CHECK (seniority IN ('junior', 'confirmé', 'senior', 'expert')),
            languages TEXT[] DEFAULT '{}',
            expertises TEXT[] DEFAULT '{}',
            calculated_price DECIMAL(10,2),
            booking_status TEXT DEFAULT 'draft' CHECK (booking_status IN ('draft', 'recherche', 'accepted', 'declined')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, profile_id, candidate_id)
          );

          -- Créer les index
          CREATE INDEX IF NOT EXISTS idx_hr_assignments_project ON public.hr_resource_assignments(project_id);
          CREATE INDEX IF NOT EXISTS idx_hr_assignments_candidate ON public.hr_resource_assignments(candidate_id);
          CREATE INDEX IF NOT EXISTS idx_hr_assignments_profile ON public.hr_resource_assignments(profile_id);
          CREATE INDEX IF NOT EXISTS idx_hr_assignments_status ON public.hr_resource_assignments(booking_status);

          -- Créer les politiques RLS
          ALTER TABLE public.hr_resource_assignments ENABLE ROW LEVEL SECURITY;

          -- Politique pour les candidats (lecture de leurs propres assignments)
          CREATE POLICY "Candidats peuvent voir leurs assignments" ON public.hr_resource_assignments
            FOR SELECT
            USING (
              candidate_id = auth.uid() OR
              candidate_id IS NULL OR
              booking_status = 'recherche'
            );

          -- Politique pour les clients (tous les droits sur leurs projets)
          CREATE POLICY "Clients gèrent leurs assignments" ON public.hr_resource_assignments
            FOR ALL
            USING (
              EXISTS (
                SELECT 1 FROM public.projects
                WHERE projects.id = hr_resource_assignments.project_id
                AND projects.owner_id = auth.uid()
              )
            );

          -- Politique pour les candidats (mise à jour du booking_status)
          CREATE POLICY "Candidats peuvent accepter/refuser" ON public.hr_resource_assignments
            FOR UPDATE
            USING (candidate_id = auth.uid())
            WITH CHECK (candidate_id = auth.uid());
        `
      });

      if (createError) {
        // Si exec_sql n'existe pas, on essaye directement
        console.log('Tentative de création directe...');

        const { error: directError } = await supabase.from('_temp_').select('*').limit(1);

        throw new Error(`Impossible de créer la table: ${createError.message || 'Erreur inconnue'}`);
      }

      console.log('✅ Table hr_resource_assignments créée avec succès');
    } else {
      console.log('✅ Table hr_resource_assignments existe déjà');
    }

    // 2. Vérifier les autres tables HR
    const tables = ['hr_profiles', 'hr_categories'];
    const missingTables = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        missingTables.push(table);
        console.log(`❌ Table ${table} manquante ou inaccessible`);
      } else {
        console.log(`✅ Table ${table} existe`);
      }
    }

    // 3. Si des tables manquent, les créer
    if (missingTables.includes('hr_categories')) {
      console.log('Création de hr_categories...');

      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.hr_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Insérer les catégories de base
          INSERT INTO public.hr_categories (name, description) VALUES
            ('Développement', 'Développeurs, architectes, DevOps'),
            ('Design', 'UX/UI, graphistes, motion designers'),
            ('Marketing', 'Marketing digital, growth, SEO/SEA'),
            ('Gestion de projet', 'Chefs de projet, product owners, scrum masters'),
            ('Data', 'Data scientists, data analysts, data engineers'),
            ('Support', 'Support client, QA, testeurs')
          ON CONFLICT (name) DO NOTHING;

          ALTER TABLE public.hr_categories ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Lecture publique des catégories" ON public.hr_categories
            FOR SELECT USING (true);
        `
      });

      if (!error) {
        console.log('✅ Table hr_categories créée');
      }
    }

    if (missingTables.includes('hr_profiles')) {
      console.log('Création de hr_profiles...');

      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.hr_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            category_id UUID REFERENCES public.hr_categories(id),
            base_price DECIMAL(10,2),
            skills TEXT[] DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Insérer quelques profils de base
          INSERT INTO public.hr_profiles (name, category_id, base_price)
          SELECT
            profile_name,
            (SELECT id FROM hr_categories WHERE name = category_name),
            base_price
          FROM (VALUES
            ('Développeur Full-Stack', 'Développement', 500),
            ('Développeur Frontend', 'Développement', 450),
            ('Développeur Backend', 'Développement', 450),
            ('UX/UI Designer', 'Design', 400),
            ('Chef de projet', 'Gestion de projet', 600),
            ('Product Owner', 'Gestion de projet', 650),
            ('Data Analyst', 'Data', 500),
            ('Growth Hacker', 'Marketing', 450)
          ) AS profiles(profile_name, category_name, base_price)
          ON CONFLICT DO NOTHING;

          ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Lecture publique des profils" ON public.hr_profiles
            FOR SELECT USING (true);
        `
      });

      if (!error) {
        console.log('✅ Table hr_profiles créée');
      }
    }

    // 4. Tester une requête complète
    const { data: testData, error: testError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects(id, title),
        hr_profiles(name, category_id)
      `)
      .limit(5);

    if (testError) {
      console.log('⚠️ Erreur lors du test de requête:', testError.message);
    } else {
      console.log('✅ Requête de test réussie, données:', testData?.length || 0);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Diagnostic et réparation terminés',
        tables_checked: ['hr_resource_assignments', 'hr_profiles', 'hr_categories'],
        missing_tables_fixed: missingTables
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Voir les logs pour plus de détails'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});