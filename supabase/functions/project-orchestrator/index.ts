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
      // 1. Récupérer les détails du projet
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error(`Projet non trouvé: ${projectError?.message}`);
      }

      console.log(`[project-orchestrator] Found project: ${project.title}, status: ${project.status}`);

      // 2. Récupérer les ressources acceptées via hr_resource_assignments
      const { data: acceptedAssignments, error: assignmentsError } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          seniority,
          booking_status,
          candidate_id
        `)
        .eq('project_id', projectId)
        .eq('booking_status', 'accepted');

      if (assignmentsError) {
        throw new Error(`Erreur récupération ressources: ${assignmentsError.message}`);
      }

      console.log(`[project-orchestrator] Found ${acceptedAssignments?.length || 0} accepted assignments`);

      // 3. Récupérer les profils candidats correspondants
      const candidateProfiles = [];
      for (const assignment of acceptedAssignments || []) {
        // Get profile info first
        const { data: hrProfile } = await supabaseClient
          .from('hr_profiles')
          .select('id, name, category_id')
          .eq('id', assignment.profile_id)
          .single();
        
        // Get category name if exists
        let categoryName = hrProfile?.name || 'Général';
        if (hrProfile?.category_id) {
          const { data: category } = await supabaseClient
            .from('hr_categories')
            .select('name')
            .eq('id', hrProfile.category_id)
            .single();
          if (category) {
            categoryName = category.name;
          }
        }
        
        let candidateProfile = null;
        let candidateError = null;
        
        // If candidate_id is already assigned, get that specific candidate
        if (assignment.candidate_id) {
          console.log(`[project-orchestrator] Getting assigned candidate: ${assignment.candidate_id}`);
          const result = await supabaseClient
            .from('candidate_profiles')
            .select('id, first_name, last_name, email, profile_id, seniority, status')
            .eq('id', assignment.candidate_id)
            .single();
          
          candidateProfile = result.data;
          candidateError = result.error;
        } else {
          // Otherwise, find a matching candidate by profile and seniority
          console.log(`[project-orchestrator] Finding candidate for profile: ${assignment.profile_id}, seniority: ${assignment.seniority}`);
          const result = await supabaseClient
            .from('candidate_profiles')
            .select('id, first_name, last_name, email, profile_id, seniority, status')
            .eq('profile_id', assignment.profile_id)
            .eq('seniority', assignment.seniority)
            // Don't filter by status - candidates are already accepted
            // Only exclude candidates in 'qualification' status
            .neq('status', 'qualification')
            .single();
          
          candidateProfile = result.data;
          candidateError = result.error;
        }
        
        if (candidateProfile && !candidateError) {
          console.log(`[project-orchestrator] Found candidate: ${candidateProfile.first_name} ${candidateProfile.last_name} (${candidateProfile.id})`);
          candidateProfiles.push({
            ...candidateProfile,
            assignment_id: assignment.id,
            profile_type: categoryName
          });
        } else {
          console.error(`[project-orchestrator] Could not find candidate for assignment ${assignment.id}:`, candidateError?.message);
        }
      }

      const resources = candidateProfiles;
      console.log(`[project-orchestrator] Found ${resources.length} candidate profiles`);
      
      if (resources.length === 0) {
        console.error('[project-orchestrator] NO CANDIDATES FOUND! Cannot proceed with project setup.');
        throw new Error('Aucun candidat trouvé pour les ressources acceptées. Vérifiez que les candidats existent dans candidate_profiles.');
      }
      
      const allMembers = [project.owner_id, ...resources.map((r: any) => r.id)];
      console.log(`[project-orchestrator] Team members: ${allMembers.join(', ')}`);

      // 1.5 Ajouter tous les membres dans project_teams pour le kickoff
      console.log('[project-orchestrator] Adding team members to project_teams table');
      
      // D'abord, ajouter le client
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', project.owner_id)
        .single();
      
      const teamMembersToInsert = [];
      
      if (ownerProfile) {
        teamMembersToInsert.push({
          project_id: projectId,
          member_id: ownerProfile.id,
          member_type: 'client',
          email: ownerProfile.email,
          first_name: ownerProfile.first_name || '',
          last_name: ownerProfile.last_name || '',
          role: 'owner'
        });
      }
      
      // Ensuite, ajouter tous les candidats
      for (const resource of resources) {
        teamMembersToInsert.push({
          project_id: projectId,
          member_id: resource.id,
          member_type: 'resource',
          email: resource.email,
          first_name: resource.first_name || '',
          last_name: resource.last_name || '',
          role: resource.profile_type || 'member',
          profile_type: resource.profile_type,
          seniority: resource.seniority
        });
      }
      
      // Insérer dans project_teams
      const { error: teamError } = await supabaseClient
        .from('project_teams')
        .insert(teamMembersToInsert);
      
      if (teamError) {
        console.error('[project-orchestrator] Error inserting team members:', teamError);
        // Ne pas faire échouer tout le processus pour ça
      } else {
        console.log(`[project-orchestrator] Added ${teamMembersToInsert.length} members to project_teams`);
      }

      // 2. Le kickoff sera créé par project-kickoff, pas ici
      // Mais on a besoin de la date pour les autres événements
      const kickoffDate = new Date(project.project_date);
      kickoffDate.setHours(9, 0, 0, 0); // 9h00 par défaut

      // Les événements par catégorie sont désactivés - seul le kickoff sera créé
      // Les événements supplémentaires pourront être ajoutés manuellement plus tard
      // Récupérer les catégories des ressources acceptées
      const resourceCategories = [...new Set(acceptedAssignments.map((a: any) => 
        a.hr_profiles?.hr_categories?.name || a.hr_profiles?.name || 'Général'
      ).filter(Boolean))];
      
      console.log('[project-orchestrator] Resource categories found:', resourceCategories);

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
            id: r.id,
            name: `${r.first_name} ${r.last_name}`,
            email: r.email,
            role: r.profile_type || 'Ressource',
            seniority: r.seniority
          }))
        })
        .select()
        .single();

      if (kanbanError) {
        console.error('[project-orchestrator] ERREUR création kanban:', kanbanError);
        console.error('[project-orchestrator] Message:', kanbanError.message);
        console.error('[project-orchestrator] Code:', kanbanError.code);
        console.error('[project-orchestrator] Details:', kanbanError.details);
        // Ne pas continuer si le kanban échoue
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Échec création Kanban: ${kanbanError.message}`,
            details: kanbanError
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        console.log(`[project-orchestrator] Created kanban board: ${kanbanBoard.id}`);

        // Créer les colonnes par catégorie de ressources
        const resourceCategories = [...new Set(resources.map((r: any) => r.profile_type))];
        const columns = [];
        
        // Colonnes standards de workflow demandées
        columns.push(
          { board_id: kanbanBoard.id, title: 'Setup', position: 0, color: '#blue' },
          { board_id: kanbanBoard.id, title: 'A faire', position: 1, color: '#gray' },
          { board_id: kanbanBoard.id, title: 'En cours', position: 2, color: '#yellow' },
          { board_id: kanbanBoard.id, title: 'A vérifier', position: 3, color: '#orange' },
          { board_id: kanbanBoard.id, title: 'Finalisé', position: 4, color: '#green' }
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
            if (column.title === 'A vérifier' || column.title === 'Finalisé') continue;
            
            // Cartes spéciales pour la colonne Setup
            if (column.title === 'Setup') {
              // Formater les dates
              const projectDate = new Date(project.project_date).toLocaleDateString('fr-FR');
              const dueDate = project.due_date ? new Date(project.due_date).toLocaleDateString('fr-FR') : 'Non définie';
              
              // Formater le budget
              const budgetFormatted = project.client_budget 
                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(project.client_budget)
                : 'Non défini';
              
              // Créer la liste des membres de l'équipe
              const teamMembersList = resources.map((r: any) => 
                `• ${r.first_name} ${r.last_name} - ${r.profile_type || 'Ressource'} (${r.seniority})`
              ).join('\n');
              
              // Cartes de rappel du projet
              cards.push(
                {
                  board_id: kanbanBoard.id,
                  column_id: column.id,
                  title: '📋 Rappel - Description du projet',
                  description: `${project.description || 'Aucune description fournie'}\n\n🎯 Objectif principal du projet`,
                  position: 0,
                  created_by: project.owner_id,
                  status: 'todo',
                  priority: 'high'
                },
                {
                  board_id: kanbanBoard.id,
                  column_id: column.id,
                  title: '📅 Rappel - Dates clés',
                  description: `📍 Date de début: ${projectDate}\n📍 Date de fin prévue: ${dueDate}\n\n⏱️ Durée estimée du projet`,
                  position: 1,
                  created_by: project.owner_id,
                  status: 'todo',
                  priority: 'high'
                },
                {
                  board_id: kanbanBoard.id,
                  column_id: column.id,
                  title: '💰 Rappel - Budget global',
                  description: `Budget total alloué: ${budgetFormatted}\n\n💡 À répartir entre les différentes phases du projet`,
                  position: 2,
                  created_by: project.owner_id,
                  status: 'todo',
                  priority: 'high'
                },
                {
                  board_id: kanbanBoard.id,
                  column_id: column.id,
                  title: '👥 Rappel - Constitution de l\'équipe',
                  description: `Membres de l'équipe:\n${teamMembersList}\n\n🔄 Coordination nécessaire entre tous les membres`,
                  position: 3,
                  created_by: project.owner_id,
                  status: 'todo',
                  priority: 'high'
                },
                {
                  board_id: kanbanBoard.id,
                  column_id: column.id,
                  title: '📦 Livrables à fournir',
                  description: `📎 Le client doit transmettre les livrables au chef de projet\n📎 Le chef de projet transmet aux membres concernés\n📎 Validation finale par le client\n\n✨ Enjoy la Team !!`,
                  position: 4,
                  created_by: project.owner_id,
                  status: 'todo',
                  priority: 'high'
                }
              );
            } else {
              // Cartes normales pour les autres colonnes
              const categoryCards = getCategoryCards(column.title, column.id, kanbanBoard.id, project.owner_id);
              cards.push(...categoryCards);
            }
          }
          
          if (cards.length > 0) {
            await supabaseClient.from('kanban_cards').insert(cards);
          }
        }
      }

      // 4. Initialiser la structure de stockage du projet
      try {
        const { data: storageData, error: storageError } = await supabaseClient.functions.invoke('init-project-storage', {
          body: {
            projectId: projectId,
            projectTitle: project.title,
            resourceCategories: resourceCategories
          }
        });

        if (storageError) {
          console.error('Erreur init-project-storage:', storageError);
        } else {
          console.log('[project-orchestrator] Project storage initialized successfully:', storageData);
        }
      } catch (storageErr) {
        console.error('[project-orchestrator] Storage initialization failed:', storageErr);
      }

      // 5. Appeler nc-orchestrator pour la structure Nextcloud (si configuré)
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
        candidate_id: r.id,
        project_id: projectId,
        resource_assignment_id: r.id,  // Utiliser l'ID du candidat
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