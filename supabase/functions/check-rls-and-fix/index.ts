import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

    console.log('=== VÉRIFICATION ET CORRECTION RLS ===')

    // 1. Vérifier si RLS est activé
    const { data: rlsStatus } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'project_event_attendees';
      `
    })

    console.log('RLS activé sur project_event_attendees:', rlsStatus)

    // 2. Lister les policies existantes
    const { data: policies } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT pol.polname, pol.polcmd 
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        WHERE cls.relname = 'project_event_attendees';
      `
    })

    console.log('Policies existantes:', policies)

    // 3. Supprimer toutes les anciennes policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Members can view attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Members can manage attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Users can view event attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Project owners can manage attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Event creators can manage attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Team members can view attendees" ON project_event_attendees;
      `
    })

    // 4. Activer RLS si nécessaire
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees ENABLE ROW LEVEL SECURITY;
      `
    })

    // 5. Créer les nouvelles policies
    await supabase.rpc('exec_sql', {
      sql: `
        -- Policy pour SELECT: tous les membres du projet peuvent voir
        CREATE POLICY "Team members can view attendees"
        ON project_event_attendees FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND (
              p.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM hr_resource_assignments hra
                WHERE hra.project_id = p.id
                AND hra.candidate_id = auth.uid()
                AND hra.booking_status = 'accepted'
              )
            )
          )
        );

        -- Policy pour INSERT: owner et créateur de l'événement peuvent ajouter
        CREATE POLICY "Event creators can add attendees"
        ON project_event_attendees FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND (
              p.owner_id = auth.uid()
              OR pe.created_by = auth.uid()
              OR EXISTS (
                SELECT 1 FROM hr_resource_assignments hra
                WHERE hra.project_id = p.id
                AND hra.candidate_id = auth.uid()
                AND hra.booking_status = 'accepted'
              )
            )
          )
        );

        -- Policy pour UPDATE: owner et participants peuvent mettre à jour leur statut
        CREATE POLICY "Attendees can update their status"
        ON project_event_attendees FOR UPDATE
        USING (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND p.owner_id = auth.uid()
          )
        )
        WITH CHECK (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND p.owner_id = auth.uid()
          )
        );

        -- Policy pour DELETE: seulement owner du projet
        CREATE POLICY "Project owners can delete attendees"
        ON project_event_attendees FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND p.owner_id = auth.uid()
          )
        );
      `
    })

    // 6. Tester l'insertion pour les événements existants
    const { data: testEvents } = await supabase
      .from('project_events')
      .select('id, title, project_id')
      .or('title.ilike.%0832%,title.ilike.%0937%')
      .limit(2)

    const testResults = []

    if (testEvents && testEvents.length > 0) {
      for (const event of testEvents) {
        // Récupérer l'équipe du projet
        const { data: project } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', event.project_id)
          .single()

        if (project) {
          // Récupérer les membres de l'équipe
          const teamMembers = []
          
          // Ajouter le client
          const { data: client } = await supabase
            .from('client_profiles')
            .select('id, email, first_name, last_name')
            .eq('id', project.owner_id)
            .single()
          
          if (client) {
            teamMembers.push({
              ...client,
              role: 'client'
            })
          }

          // Ajouter les candidats acceptés
          const { data: assignments } = await supabase
            .from('hr_resource_assignments')
            .select(`
              candidate_id,
              candidate_profiles (
                id,
                email,
                first_name,
                last_name
              )
            `)
            .eq('project_id', event.project_id)
            .eq('booking_status', 'accepted')

          if (assignments) {
            assignments.forEach(a => {
              if (a.candidate_profiles) {
                teamMembers.push({
                  ...a.candidate_profiles,
                  role: 'resource'
                })
              }
            })
          }

          // Essayer d'ajouter les participants
          const attendees = teamMembers.map(member => ({
            event_id: event.id,
            user_id: member.id,
            email: member.email,
            role: member.role,
            required: true,
            response_status: 'pending'
          }))

          const { error: insertError } = await supabase
            .from('project_event_attendees')
            .insert(attendees)

          testResults.push({
            event: event.title,
            teamSize: teamMembers.length,
            insertSuccess: !insertError,
            error: insertError?.message || null
          })
        }
      }
    }

    // 7. Vérifier le résultat
    const { data: finalCheck } = await supabase
      .from('project_events')
      .select(`
        id,
        title,
        project_event_attendees (
          id,
          user_id,
          email,
          role
        )
      `)
      .or('title.ilike.%0832%,title.ilike.%0937%')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Policies RLS corrigées et participants ajoutés',
        testResults,
        finalCheck
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})