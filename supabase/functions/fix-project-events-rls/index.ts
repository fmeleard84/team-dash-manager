import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    });

    console.log('Starting RLS fix for project_events...');

    // 1. Supprimer les anciennes politiques
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Candidates can view their project events" ON public.project_events;
      DROP POLICY IF EXISTS "Users can view project events" ON public.project_events;
      DROP POLICY IF EXISTS "Team members can view project events" ON public.project_events;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropPoliciesSQL
    }).single();

    if (dropError && !dropError.message?.includes('does not exist')) {
      console.error('Error dropping policies:', dropError);
    }

    // 2. Supprimer les anciennes fonctions
    const dropFunctionsSQL = `
      DROP FUNCTION IF EXISTS public.is_project_team_member(uuid, uuid);
      DROP FUNCTION IF EXISTS public.is_event_attendee(uuid, text);
    `;

    const { error: dropFuncError } = await supabase.rpc('exec_sql', {
      sql: dropFunctionsSQL
    }).single();

    if (dropFuncError && !dropFuncError.message?.includes('does not exist')) {
      console.error('Error dropping functions:', dropFuncError);
    }

    // 3. Créer la nouvelle fonction
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.can_view_project_event(
        p_project_id uuid,
        p_event_id uuid,
        p_user_id uuid
      )
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_can_view boolean := false;
        v_user_email text;
        v_candidate_id uuid;
        v_client_id uuid;
      BEGIN
        -- Récupérer l'email de l'utilisateur authentifié
        SELECT email INTO v_user_email 
        FROM auth.users 
        WHERE id = p_user_id;
        
        -- Vérifier si c'est un candidat
        SELECT id INTO v_candidate_id
        FROM candidate_profiles
        WHERE email = v_user_email;
        
        -- Vérifier si c'est un client
        SELECT id INTO v_client_id
        FROM client_profiles
        WHERE email = v_user_email;
        
        -- Cas 1: L'utilisateur est le propriétaire du projet (client)
        IF v_client_id IS NOT NULL THEN
          SELECT EXISTS(
            SELECT 1 FROM projects 
            WHERE id = p_project_id 
            AND owner_id = v_client_id
          ) INTO v_can_view;
          
          IF v_can_view THEN
            RETURN true;
          END IF;
        END IF;
        
        -- Cas 2: L'utilisateur est un candidat accepté sur ce projet
        IF v_candidate_id IS NOT NULL THEN
          -- Vérifier via hr_resource_assignments
          SELECT EXISTS(
            SELECT 1 
            FROM hr_resource_assignments hra
            WHERE hra.project_id = p_project_id
            AND hra.candidate_id = v_candidate_id
            AND hra.booking_status = 'accepted'
          ) INTO v_can_view;
          
          IF v_can_view THEN
            RETURN true;
          END IF;
          
          -- Vérifier aussi via project_teams (au cas où)
          SELECT EXISTS(
            SELECT 1 
            FROM project_teams pt
            WHERE pt.project_id = p_project_id
            AND pt.member_id = v_candidate_id
          ) INTO v_can_view;
          
          IF v_can_view THEN
            RETURN true;
          END IF;
        END IF;
        
        -- Cas 3: L'utilisateur est dans les attendees de l'événement
        IF v_user_email IS NOT NULL THEN
          SELECT EXISTS(
            SELECT 1 
            FROM project_event_attendees pea
            WHERE pea.event_id = p_event_id
            AND pea.email = v_user_email
          ) INTO v_can_view;
          
          IF v_can_view THEN
            RETURN true;
          END IF;
        END IF;
        
        RETURN false;
      END;
      $$;
    `;

    const { error: createFuncError } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    }).single();

    if (createFuncError) {
      console.error('Error creating function:', createFuncError);
      throw createFuncError;
    }

    // 4. Créer les nouvelles politiques
    const createPoliciesSQL = `
      -- Politique pour la lecture
      CREATE POLICY "Users can view their project events" 
      ON public.project_events 
      FOR SELECT 
      USING (
        public.can_view_project_event(project_id, id, auth.uid())
      );

      -- Politique pour permettre aux clients de gérer leurs événements
      CREATE POLICY "Clients can manage their project events"
      ON public.project_events
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM projects p
          JOIN client_profiles cp ON cp.id = p.owner_id
          JOIN auth.users u ON u.email = cp.email
          WHERE p.id = project_events.project_id
          AND u.id = auth.uid()
        )
      );

      -- Politique pour les edge functions
      CREATE POLICY "Service role can manage events"
      ON public.project_events
      FOR ALL
      USING (
        auth.role() = 'service_role'
      );
    `;

    const { error: createPolError } = await supabase.rpc('exec_sql', {
      sql: createPoliciesSQL
    }).single();

    if (createPolError) {
      console.error('Error creating policies:', createPolError);
      throw createPolError;
    }

    // 5. S'assurer que RLS est activé
    const enableRLSSQL = `
      ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: enableRLSSQL
    }).single();

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    }

    // 6. Vérifier le résultat
    const { data: checkData } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'project_events')
      .eq('schemaname', 'public');

    console.log('New policies created:', checkData?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS permissions fixed for project_events',
        policiesCount: checkData?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-project-events-rls:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});