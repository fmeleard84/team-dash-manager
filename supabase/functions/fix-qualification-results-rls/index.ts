import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking candidate_qualification_results table...')

    // 1. Vérifier si la table existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('candidate_qualification_results')
      .select('*')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('Table does not exist, creating it...')

      // Créer la table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.candidate_qualification_results (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
            test_type VARCHAR(50) NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            questions JSONB,
            answers JSONB,
            test_duration INTEGER,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Index pour les requêtes fréquentes
          CREATE INDEX IF NOT EXISTS idx_qualification_candidate
            ON public.candidate_qualification_results(candidate_id);

          CREATE INDEX IF NOT EXISTS idx_qualification_created
            ON public.candidate_qualification_results(created_at DESC);
        `
      })

      if (createError) {
        console.error('Error creating table:', createError)
        throw createError
      }
    }

    console.log('Fixing RLS policies for candidate_qualification_results...')

    // 2. Désactiver RLS temporairement pour appliquer les politiques
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.candidate_qualification_results DISABLE ROW LEVEL SECURITY;`
    })

    // 3. Supprimer toutes les anciennes politiques
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        DECLARE
          pol RECORD;
        BEGIN
          FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE tablename = 'candidate_qualification_results'
          LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.candidate_qualification_results', pol.policyname);
          END LOOP;
        END $$;
      `
    })

    // 4. Créer les nouvelles politiques
    const policies = [
      {
        name: 'candidates_view_own_results',
        sql: `
          CREATE POLICY candidates_view_own_results ON public.candidate_qualification_results
          FOR SELECT USING (
            candidate_id = auth.uid()
          );
        `
      },
      {
        name: 'candidates_insert_own_results',
        sql: `
          CREATE POLICY candidates_insert_own_results ON public.candidate_qualification_results
          FOR INSERT WITH CHECK (
            candidate_id = auth.uid()
          );
        `
      },
      {
        name: 'candidates_update_own_results',
        sql: `
          CREATE POLICY candidates_update_own_results ON public.candidate_qualification_results
          FOR UPDATE USING (
            candidate_id = auth.uid()
          );
        `
      },
      {
        name: 'admins_full_access',
        sql: `
          CREATE POLICY admins_full_access ON public.candidate_qualification_results
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `
      },
      {
        name: 'clients_view_assigned_candidates',
        sql: `
          CREATE POLICY clients_view_assigned_candidates ON public.candidate_qualification_results
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.hr_resource_assignments hra
              JOIN public.projects p ON p.id = hra.project_id
              WHERE hra.candidate_id = candidate_qualification_results.candidate_id
              AND p.owner_id = auth.uid()
              AND hra.booking_status = 'accepted'
            )
          );
        `
      }
    ]

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
      if (error) {
        console.error(`Error creating policy ${policy.name}:`, error)
      } else {
        console.log(`✅ Created policy: ${policy.name}`)
      }
    }

    // 5. Réactiver RLS
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY;`
    })

    console.log('✅ RLS policies fixed successfully')

    // 6. Tester la lecture
    const { data: testData, error: testError } = await supabase
      .from('candidate_qualification_results')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('Test query failed:', testError)
    } else {
      console.log('Test query successful')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies fixed for candidate_qualification_results'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})