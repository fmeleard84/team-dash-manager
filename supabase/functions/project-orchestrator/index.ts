import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, projectId } = await req.json();
    console.log(`[project-orchestrator] Action: ${action}, Project: ${projectId}`);

    if (action === 'setup-project') {
      // 1. Récupérer les détails du projet et les ressources acceptées
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select(`
          *,
          project_bookings!inner(
            candidate_id,
            status,
            candidate_profiles!inner(
              id, first_name, last_name, email, profile_type, seniority
            )
          )
        `)
        .eq('id', projectId)
        .eq('project_bookings.status', 'accepted')
        .single();

      if (projectError || !project) {
        throw new Error(`Projet non trouvé: ${projectError?.message}`);
      }

      console.log(`[project-orchestrator] Found project: ${project.title}`);

      const resources = project.project_bookings || [];
      const allMembers = [project.owner_id, ...resources.map((r: any) => r.candidate_profiles.id)];

      // 2. Créer le planning avec événement de kickoff
      const kickoffDate = new Date(project.project_date);
      kickoffDate.setHours(9, 0, 0, 0); // 9h00 par défaut
      const kickoffEnd = new Date(kickoffDate);
      kickoffEnd.setHours(10, 0, 0, 0); // 1h de durée

      const { data: kickoffEvent, error: eventError } = await supabaseClient
        .from('project_events')
        .insert({
          project_id: projectId,
          title: `Kickoff - ${project.title}`,
          description: `Réunion de lancement du projet "${project.title}". Présentation de l'équipe et des objectifs.`,
          start_at: kickoffDate.toISOString(),
          end_at: kickoffEnd.toISOString(),
          video_url: `https://meet.jit.si/kickoff-${projectId}`,
          created_by: project.owner_id
        })
        .select()
        .single();

      if (eventError) {
        console.error('Erreur création événement kickoff:', eventError);
      } else {
        console.log(`[project-orchestrator] Created kickoff event: ${kickoffEvent.id}`);

        // Ajouter les participants au kickoff
        const attendees = resources.map((r: any) => ({
          event_id: kickoffEvent.id,
          email: r.candidate_profiles.email,
          profile_id: r.candidate_profiles.id
        }));

        if (attendees.length > 0) {
          await supabaseClient
            .from('project_event_attendees')
            .insert(attendees);
        }
      }

      // 3. Créer le tableau Kanban
      const { data: kanbanBoard, error: kanbanError } = await supabaseClient
        .from('kanban_boards')
        .insert({
          project_id: projectId,
          title: `Kanban - ${project.title}`,
          description: `Tableau de gestion des tâches pour le projet "${project.title}"`,
          created_by: project.owner_id,
          members: allMembers,
          team_members: resources.map((r: any) => ({
            id: r.candidate_profiles.id,
            name: `${r.candidate_profiles.first_name} ${r.candidate_profiles.last_name}`,
            email: r.candidate_profiles.email,
            role: r.candidate_profiles.profile_type || 'Ressource',
            seniority: r.candidate_profiles.seniority
          }))
        })
        .select()
        .single();

      if (kanbanError) {
        console.error('Erreur création kanban:', kanbanError);
      } else {
        console.log(`[project-orchestrator] Created kanban board: ${kanbanBoard.id}`);

        // Créer les colonnes par défaut
        const defaultColumns = [
          { title: 'À faire', position: 0, color: '#gray' },
          { title: 'En cours', position: 1, color: '#blue' },
          { title: 'En révision', position: 2, color: '#orange' },
          { title: 'Terminé', position: 3, color: '#green' }
        ];

        for (const col of defaultColumns) {
          await supabaseClient
            .from('kanban_columns')
            .insert({
              board_id: kanbanBoard.id,
              title: col.title,
              position: col.position,
              color: col.color
            });
        }
      }

      // 4. Créer notifications pour tous les participants
      const notifications = resources.map((r: any) => ({
        candidate_id: r.candidate_profiles.id,
        project_id: projectId,
        resource_assignment_id: r.id,
        title: `Bienvenue dans le projet ${project.title} !`,
        description: `Le projet "${project.title}" a été configuré. Vous pouvez maintenant accéder au planning, au kanban et à la messagerie.`,
        status: 'unread'
      }));

      if (notifications.length > 0) {
        const { error: notifError } = await supabaseClient
          .from('candidate_notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Erreur création notifications:', notifError);
        } else {
          console.log(`[project-orchestrator] Created ${notifications.length} notifications`);
        }
      }

      // 5. Mettre à jour le statut du projet
      await supabaseClient
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Projet configuré avec succès',
          data: {
            kanbanBoardId: kanbanBoard?.id,
            kickoffEventId: kickoffEvent?.id,
            participantsCount: resources.length
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[project-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})