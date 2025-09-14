import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier si la table existe
    const { data: checkTable, error: checkError } = await supabase
      .from('candidate_qualification_results')
      .select('id')
      .limit(1)

    if (checkError && checkError.code === '42P01') {
      // La table n'existe pas, la créer
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Créer la table candidate_qualification_results si elle n'existe pas
          CREATE TABLE IF NOT EXISTS public.candidate_qualification_results (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
            test_id TEXT,
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 100,
            status TEXT CHECK (status IN ('pending', 'passed', 'failed')),
            test_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          -- Créer un index pour les requêtes par candidat
          CREATE INDEX IF NOT EXISTS idx_qualification_results_candidate
            ON public.candidate_qualification_results(candidate_id);

          -- Créer un index pour les requêtes par date
          CREATE INDEX IF NOT EXISTS idx_qualification_results_date
            ON public.candidate_qualification_results(created_at DESC);

          -- Activer RLS
          ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY;

          -- Politique pour les candidats (lecture de leurs propres résultats)
          CREATE POLICY "Candidats peuvent voir leurs résultats"
            ON public.candidate_qualification_results
            FOR SELECT
            USING (candidate_id = auth.uid());

          -- Politique pour les admins et clients (lecture de tous les résultats)
          CREATE POLICY "Admins et clients peuvent voir tous les résultats"
            ON public.candidate_qualification_results
            FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'client')
              )
            );

          -- Politique pour créer/modifier les résultats (candidats uniquement pour leurs propres résultats)
          CREATE POLICY "Candidats peuvent créer/modifier leurs résultats"
            ON public.candidate_qualification_results
            FOR ALL
            USING (candidate_id = auth.uid())
            WITH CHECK (candidate_id = auth.uid());

          -- Fonction trigger pour mettre à jour updated_at
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ language 'plpgsql';

          -- Créer le trigger
          CREATE TRIGGER update_qualification_results_updated_at
            BEFORE UPDATE ON public.candidate_qualification_results
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      })

      if (createError) {
        console.error('Erreur lors de la création de la table:', createError)
        throw createError
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Table candidate_qualification_results créée avec succès'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (checkError) {
      // Autre erreur que table inexistante
      console.error('Erreur lors de la vérification:', checkError)

      // Essayer de corriger les politiques RLS
      const { error: fixRlsError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Supprimer les anciennes politiques si elles existent
          DROP POLICY IF EXISTS "Candidats peuvent voir leurs résultats" ON public.candidate_qualification_results;
          DROP POLICY IF EXISTS "Admins et clients peuvent voir tous les résultats" ON public.candidate_qualification_results;
          DROP POLICY IF EXISTS "Candidats peuvent créer/modifier leurs résultats" ON public.candidate_qualification_results;

          -- Recréer les politiques RLS
          CREATE POLICY "Candidats peuvent voir leurs résultats"
            ON public.candidate_qualification_results
            FOR SELECT
            USING (candidate_id = auth.uid());

          CREATE POLICY "Admins et clients peuvent voir tous les résultats"
            ON public.candidate_qualification_results
            FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'client')
              )
            );

          CREATE POLICY "Candidats peuvent créer/modifier leurs résultats"
            ON public.candidate_qualification_results
            FOR ALL
            USING (candidate_id = auth.uid())
            WITH CHECK (candidate_id = auth.uid());
        `
      })

      if (fixRlsError) {
        console.error('Erreur lors de la correction des RLS:', fixRlsError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Politiques RLS corrigées'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // La table existe et fonctionne
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Table candidate_qualification_results existe déjà et fonctionne'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})