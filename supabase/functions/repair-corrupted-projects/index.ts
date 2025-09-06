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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { projectId } = await req.json();
    
    console.log(`🔧 Repairing corrupted project: ${projectId}`);
    
    // 1. Récupérer le projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        client_profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Project found: ${project.title}, status: ${project.status}`);
    
    // Vérifier si le projet est en 'play'
    if (project.status !== 'play') {
      return new Response(
        JSON.stringify({ 
          error: 'Project is not in play status', 
          details: `Current status: ${project.status}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const repairs = {
      kanban: false,
      kickoff: false,
      notifications: false,
      teamMembers: []
    };
    
    // 2. Vérifier et créer le kanban si nécessaire
    const { data: existingKanban } = await supabase
      .from('kanban_boards')
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    if (!existingKanban) {
      console.log('Creating missing kanban board...');
      
      const { data: kanbanBoard, error: kanbanError } = await supabase
        .from('kanban_boards')
        .insert({
          project_id: projectId,
          title: `Kanban - ${project.title}`,
          description: `Tableau Kanban pour le projet ${project.title}`,
          created_by: project.owner_id
        })
        .select()
        .single();
      
      if (!kanbanError && kanbanBoard) {
        // Créer les colonnes par défaut
        const columns = [
          { title: 'Setup', position: 0, color: '#9CA3AF' },
          { title: 'À faire', position: 1, color: '#3B82F6' },
          { title: 'En cours', position: 2, color: '#F59E0B' },
          { title: 'À vérifier', position: 3, color: '#8B5CF6' },
          { title: 'Finalisé', position: 4, color: '#10B981' }
        ];
        
        for (const col of columns) {
          await supabase
            .from('kanban_columns')
            .insert({
              board_id: kanbanBoard.id,
              ...col
            });
        }
        
        repairs.kanban = true;
        console.log('✅ Kanban board created');
      }
    }
    
    // 3. Récupérer les ressources acceptées pour l'équipe
    const { data: acceptedAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        profile_id,
        role,
        candidate_profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('booking_status', 'accepted');
    
    // Construire la liste des membres de l'équipe
    const teamMembers = [];
    
    // Ajouter le client
    if (project.client_profiles) {
      teamMembers.push({
        member_id: project.owner_id,
        email: project.client_profiles.email,
        first_name: project.client_profiles.first_name,
        last_name: project.client_profiles.last_name,
        member_type: 'client'
      });
    }
    
    // Ajouter les candidats acceptés
    if (acceptedAssignments) {
      for (const assignment of acceptedAssignments) {
        if (assignment.candidate_profiles) {
          teamMembers.push({
            member_id: assignment.candidate_id,
            email: assignment.candidate_profiles.email,
            first_name: assignment.candidate_profiles.first_name,
            last_name: assignment.candidate_profiles.last_name,
            member_type: 'resource'
          });
        }
      }
    }
    
    repairs.teamMembers = teamMembers;
    console.log(`Found ${teamMembers.length} team members`);
    
    // 4. Vérifier et créer l'événement kickoff si nécessaire
    const { data: existingEvents } = await supabase
      .from('project_events')
      .select('id')
      .eq('project_id', projectId);
    
    if (!existingEvents || existingEvents.length === 0) {
      console.log('Creating missing kickoff event...');
      
      const kickoffDate = new Date();
      kickoffDate.setDate(kickoffDate.getDate() + 1); // Demain
      const kickoffEndTime = new Date(kickoffDate.getTime() + 60 * 60 * 1000); // 1 heure
      
      const { data: kickoffEvent, error: eventError } = await supabase
        .from('project_events')
        .insert({
          project_id: projectId,
          title: `Kickoff - ${project.title}`,
          description: `Réunion de lancement du projet ${project.title}`,
          start_at: kickoffDate.toISOString(),
          end_at: kickoffEndTime.toISOString(),
          video_url: `https://meet.jit.si/${projectId}-kickoff`,
          created_by: project.owner_id
        })
        .select()
        .single();
      
      if (!eventError && kickoffEvent) {
        repairs.kickoff = true;
        console.log('✅ Kickoff event created');
        
        // Ajouter les participants
        if (teamMembers.length > 0) {
          const attendees = teamMembers.map(member => ({
            event_id: kickoffEvent.id,
            email: member.email,
            required: true,
            response_status: 'pending'
          }));
          
          await supabase
            .from('project_event_attendees')
            .insert(attendees);
          
          console.log(`Added ${attendees.length} attendees`);
        }
        
        // 5. Créer les notifications pour les candidats
        const candidateNotifications = teamMembers
          .filter(member => member.member_type === 'resource')
          .map(member => ({
            candidate_id: member.member_id,
            project_id: projectId,
            event_id: kickoffEvent.id,
            title: `Invitation Kickoff - ${project.title}`,
            description: `Vous êtes invité à la réunion de lancement du projet "${project.title}"`,
            event_date: kickoffDate.toISOString(),
            location: null,
            video_url: `https://meet.jit.si/${projectId}-kickoff`,
            status: 'pending'
          }));
        
        if (candidateNotifications.length > 0) {
          const { error: notifError } = await supabase
            .from('candidate_event_notifications')
            .insert(candidateNotifications);
          
          if (!notifError) {
            repairs.notifications = true;
            console.log(`✅ Created ${candidateNotifications.length} notifications`);
          } else {
            console.error('Error creating notifications:', notifError);
          }
        }
      } else {
        console.error('Error creating kickoff event:', eventError);
      }
    }
    
    // 6. Créer une notification générale pour les candidats
    const candidatesWithoutNotifications = teamMembers
      .filter(member => member.member_type === 'resource');
    
    if (candidatesWithoutNotifications.length > 0) {
      const generalNotifications = candidatesWithoutNotifications.map(member => ({
        candidate_id: member.member_id,
        title: `Bienvenue dans le projet ${project.title}`,
        message: `Le projet "${project.title}" est maintenant actif. Vous avez accès aux outils collaboratifs.`,
        type: 'info',
        read: false,
        project_id: projectId
      }));
      
      await supabase
        .from('candidate_notifications')
        .insert(generalNotifications);
      
      console.log(`Created ${generalNotifications.length} general notifications`);
    }
    
    // Résumé des réparations
    const summary = {
      success: true,
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      },
      repairs: {
        kanban_created: repairs.kanban,
        kickoff_created: repairs.kickoff,
        notifications_created: repairs.notifications,
        team_members_found: teamMembers.length
      },
      message: 'Project successfully repaired'
    };
    
    console.log('✅ Repair completed:', summary);
    
    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in repair-corrupted-projects:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});