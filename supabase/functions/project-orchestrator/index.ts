import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper functions
function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case 'marketing':
      return '#purple';
    case 'développement':
      return '#blue';
    case 'gestion de projet':
      return '#indigo';
    case 'finance':
      return '#green';
    case 'comptabilité':
      return '#emerald';
    case 'content':
      return '#orange';
    default:
      return '#gray';
  }
}

function getCategoryCards(category: string, columnId: string, boardId: string, createdBy: string): any[] {
  const baseCards = {
    'marketing': [
      { title: 'Brief créatif', description: 'Définir les concepts et la direction créative' },
      { title: 'Stratégie de contenu', description: 'Planifier la production de contenu' },
      { title: 'Validation campagne', description: 'Valider les éléments de la campagne' }
    ],
    'développement': [
      { title: 'Setup environnement', description: 'Configurer l\'environnement de développement' },
      { title: 'Architecture technique', description: 'Définir l\'architecture et les spécifications' },
      { title: 'Développement features', description: 'Développer les fonctionnalités principales' },
      { title: 'Tests et validation', description: 'Tests unitaires et validation du code' }
    ],
    'gestion de projet': [
      { title: 'Planification détaillée', description: 'Définir le planning et les jalons' },
      { title: 'Suivi budget', description: 'Monitorer l\'avancement budgétaire' },
      { title: 'Coordination équipe', description: 'Organiser les réunions et le suivi équipe' },
      { title: 'Reporting client', description: 'Préparer les rapports d\'avancement' }
    ],
    'finance': [
      { title: 'Analyse financière', description: 'Analyser les données financières du projet' },
      { title: 'Validation budget', description: 'Valider les allocations budgétaires' },
      { title: 'Reporting financier', description: 'Produire les rapports financiers' }
    ],
    'comptabilité': [
      { title: 'Setup comptable', description: 'Mettre en place la structure comptable' },
      { title: 'Saisie écritures', description: 'Enregistrer les écritures comptables' },
      { title: 'Rapprochements', description: 'Effectuer les rapprochements bancaires' }
    ],
    'content': [
      { title: 'Stratégie éditoriale', description: 'Définir la ligne éditoriale' },
      { title: 'Production contenu', description: 'Créer et rédiger les contenus' },
      { title: 'Optimisation SEO', description: 'Optimiser les contenus pour le référencement' }
    ]
  };

  const categoryKey = category?.toLowerCase() || 'default';
  const cards = baseCards[categoryKey] || [
    { title: `Action ${category}`, description: `Tâche principale pour ${category}` }
  ];

  return cards.map((card, index) => ({
    board_id: boardId,
    column_id: columnId,
    title: card.title,
    description: card.description,
    position: index,
    created_by: createdBy,
    status: 'todo',
    priority: 'medium'
  }));
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
            id,
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

      // 2. Créer le planning avec événements enrichis par catégorie
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

      // Créer des événements contextualisés par catégorie de ressources
      const resourceCategories = [...new Set(resources.map((r: any) => r.candidate_profiles.profile_type))];
      const categoryEvents = [];
      
      for (const category of resourceCategories) {
        const categoryDate = new Date(kickoffDate);
        categoryDate.setDate(categoryDate.getDate() + 3); // 3 jours après le kickoff
        categoryDate.setHours(14, 0, 0, 0); // 14h00
        const categoryEnd = new Date(categoryDate);
        categoryEnd.setHours(15, 30, 0, 0); // 1h30 de durée

        let eventTitle = '';
        let eventDescription = '';
        
        switch (category?.toLowerCase()) {
          case 'marketing':
            eventTitle = 'Workshop Stratégie Marketing';
            eventDescription = 'Définition de la stratégie marketing et validation des concepts créatifs.';
            break;
          case 'développement':
            eventTitle = 'Architecture Review';
            eventDescription = 'Revue de l\'architecture technique et définition des spécifications.';
            break;
          case 'gestion de projet':
            eventTitle = 'Point de Pilotage';
            eventDescription = 'Première réunion de suivi et définition des jalons projet.';
            break;
          case 'finance':
            eventTitle = 'Validation Budget';
            eventDescription = 'Revue du budget et validation des allocations financières.';
            break;
          default:
            eventTitle = `Workshop ${category}`;
            eventDescription = `Réunion de travail dédiée aux aspects ${category} du projet.`;
        }

        categoryEvents.push({
          project_id: projectId,
          title: eventTitle,
          description: eventDescription,
          start_at: categoryDate.toISOString(),
          end_at: categoryEnd.toISOString(),
          video_url: `https://meet.jit.si/${category?.toLowerCase()}-${projectId}`,
          created_by: project.owner_id
        });
      }

      if (categoryEvents.length > 0) {
        await supabaseClient.from('project_events').insert(categoryEvents);
      }

      if (eventError) {
        console.error('Erreur création événement kickoff:', eventError);
      } else {
        console.log(`[project-orchestrator] Created kickoff event: ${kickoffEvent.id}`);

        // Ajouter les participants au kickoff - utiliser candidate_profiles.id
        const attendees = resources.map((r: any) => ({
          event_id: kickoffEvent.id,
          email: r.candidate_profiles.email,
          profile_id: r.candidate_profiles.id  // Utiliser l'ID du profil candidat
        }));

        if (attendees.length > 0) {
          const { error: attendeesError } = await supabaseClient
            .from('project_event_attendees')
            .insert(attendees);
          
          if (attendeesError) {
            console.error('Erreur ajout attendees:', attendeesError);
          }
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

        // Créer les colonnes par catégorie de ressources
        const resourceCategories = [...new Set(resources.map((r: any) => r.candidate_profiles.profile_type))];
        const columns = [];
        
        // Colonnes standards de workflow demandées
        columns.push(
          { board_id: kanbanBoard.id, title: 'Setup', position: 0, color: '#blue' },
          { board_id: kanbanBoard.id, title: 'A faire', position: 1, color: '#gray' },
          { board_id: kanbanBoard.id, title: 'En cours', position: 2, color: '#yellow' },
          { board_id: kanbanBoard.id, title: 'A contrôler', position: 3, color: '#orange' },
          { board_id: kanbanBoard.id, title: 'Terminé', position: 4, color: '#green' }
        );

        // Insérer toutes les colonnes
        const { data: createdColumns } = await supabaseClient
          .from('kanban_columns')
          .insert(columns)
          .select();

        // Créer des cartes contextualisées par catégorie
        if (createdColumns) {
          const cards = [];
          
          for (const column of createdColumns) {
            if (column.title === 'En révision' || column.title === 'Terminé') continue;
            
            const categoryCards = getCategoryCards(column.title, column.id, kanbanBoard.id, project.owner_id);
            cards.push(...categoryCards);
          }
          
          if (cards.length > 0) {
            await supabaseClient.from('kanban_cards').insert(cards);
          }
        }
      }

      // 4. Appeler nc-orchestrator pour la structure Nextcloud
      try {
        const { data: ncData, error: ncError } = await supabaseClient.functions.invoke('nc-orchestrator', {
          body: {
            action: 'project-start',
            projectId: projectId,
            resourceCategories: resourceCategories
          }
        });

        if (ncError) {
          console.error('Erreur nc-orchestrator:', ncError);
        } else {
          console.log('[project-orchestrator] NC workspace created successfully');
        }
      } catch (ncErr) {
        console.error('[project-orchestrator] NC orchestrator call failed:', ncErr);
      }

      // 5. Créer notifications pour tous les participants
      const notifications = resources.map((r: any) => ({
        candidate_id: r.candidate_profiles.id,
        project_id: projectId,
        resource_assignment_id: r.id,  // Utiliser l'ID du booking, pas du resource assignment
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

      // 6. Mettre à jour le statut du projet
      await supabaseClient
        .from('projects')
        .update({ status: 'play' })
        .eq('id', projectId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Projet configuré avec succès',
          data: {
            kanbanBoardId: kanbanBoard?.id,
            kickoffEventId: kickoffEvent?.id,
            participantsCount: resources.length,
            categoriesSetup: resourceCategories
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