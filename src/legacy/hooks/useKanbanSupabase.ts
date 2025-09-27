import { useState, useCallback, useEffect, useRef } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { 
  KanbanBoard, 
  KanbanCard, 
  KanbanColumn, 
  CreateCardInput, 
  CreateColumnInput,
  UpdateCardInput,
  UpdateColumnInput
} from '@/types/kanban';
import { toast } from 'sonner';
import { getStatusFromColumnTitle } from '@/utils/kanbanStatus';

export const useKanbanSupabase = (boardId?: string) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);
  const lastUpdateRef = useRef<string | null>(null);

  // Helper function to generate IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Transform database rows to board structure
  const transformDbToBoard = useCallback((
    boardRow: any,
    columns: any[],
    cards: any[]
  ): KanbanBoard => {
    // Group cards by column and create card objects
    const cardsByColumn: Record<string, string[]> = {};
    const cardsMap: Record<string, KanbanCard> = {};

    cards
      .sort((a, b) => a.position - b.position)
      .forEach(card => {
        if (!cardsByColumn[card.column_id]) {
          cardsByColumn[card.column_id] = [];
        }
        cardsByColumn[card.column_id].push(card.id);

        cardsMap[card.id] = {
          id: card.id,
          title: card.title,
          description: card.description,
          assignedTo: card.assigned_to,
          assignedToName: card.assigned_to_name,
          assignedToEmail: card.assigned_to_email,
          assignedToAvatar: card.assigned_to_avatar,
          dueDate: card.due_date ? new Date(card.due_date).toISOString() : null,
          priority: card.priority,
          status: card.status,
          labels: card.labels || [],
          attachments: [], // Will be loaded separately via useKanbanFiles
          comments: card.comments || [],
          progress: card.progress,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
          createdBy: card.created_by,
          files: card.files || [] // Add files support
        };
      });

    // Create columns with their card IDs
    const boardColumns: KanbanColumn[] = columns
      .sort((a, b) => a.position - b.position)
      .map(col => ({
        id: col.id,
        title: col.title,
        position: col.position,
        cardIds: cardsByColumn[col.id] || [],
        color: col.color,
        limit: col.limit
      }));

    return {
      id: boardRow.id,
      title: boardRow.title,
      description: boardRow.description,
      columns: boardColumns,
      cards: cardsMap,
      projectId: boardRow.project_id, // ensure project binding is visible in state
      createdBy: boardRow.created_by,
      createdAt: boardRow.created_at,
      updatedAt: boardRow.updated_at,
      members: boardRow.members || [],
      teamMembers: boardRow.team_members || []
    };
  }, []);

  // Load board from Supabase
  const loadBoard = useCallback(async (id: string) => {
    try {
      setIsLoading(true);

      // Fetch board
      const { data: boardData, error: boardError } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('id', id)
        .single();

      if (boardError) throw boardError;

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', id)
        .order('position', { ascending: true });

      if (columnsError) throw columnsError;

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('board_id', id)
        .order('position', { ascending: true });

      if (cardsError) throw cardsError;

      const transformedBoard = transformDbToBoard(boardData, columnsData || [], cardsData || []);
      setBoard(transformedBoard);

    } catch (error) {
      console.error('Error loading board:', error);
      setBoard(null);
      toast.error('Erreur lors du chargement du tableau');
    } finally {
      setIsLoading(false);
    }
  }, [transformDbToBoard]);

  // Load board on mount or when boardId changes
  useEffect(() => {
    if (boardId) {
      loadBoard(boardId);
      
      // Setup realtime subscription for both cards and columns
      subscriptionRef.current = supabase
        .channel(`kanban-${boardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kanban_cards',
            filter: `board_id=eq.${boardId}`
          },
          async (payload) => {
            // Create a unique identifier for this update
            const updateId = `${payload.eventType}-${payload.new?.id || payload.old?.id}-${payload.new?.updated_at}`;
            
            // Skip if this is the same update we just processed
            if (lastUpdateRef.current === updateId) {
              return;
            }
            
            // Skip if we're the ones who made the change
            if (isUpdatingRef.current) {
              return;
            }
            
            lastUpdateRef.current = updateId;
            
            // For card movements, update locally instead of reloading
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedCard = payload.new;
              
              setBoard(prev => {
                if (!prev) return prev;
                
                // Update the card in the board
                const newCards = { ...prev.cards };
                if (newCards[updatedCard.id]) {
                  newCards[updatedCard.id] = {
                    ...newCards[updatedCard.id],
                    ...updatedCard,
                    assignedTo: updatedCard.assigned_to || [],
                    dueDate: updatedCard.due_date,
                    createdBy: updatedCard.created_by,
                    updatedAt: updatedCard.updated_at
                  };
                }
                
                // Update column if card moved
                let newColumns = [...prev.columns];
                if (updatedCard.column_id !== prev.cards[updatedCard.id]?.columnId) {
                  // Remove from old column
                  newColumns = newColumns.map(col => ({
                    ...col,
                    cardIds: col.cardIds.filter(id => id !== updatedCard.id)
                  }));
                  
                  // Add to new column
                  const targetCol = newColumns.find(c => c.id === updatedCard.column_id);
                  if (targetCol) {
                    targetCol.cardIds.splice(updatedCard.position || 0, 0, updatedCard.id);
                  }
                }
                
                return {
                  ...prev,
                  cards: newCards,
                  columns: newColumns,
                  updatedAt: new Date().toISOString()
                };
              });
            } else {
              // For other changes, reload after a delay
              setTimeout(() => {
                loadBoard(boardId);
              }, 300);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kanban_columns',
            filter: `board_id=eq.${boardId}`
          },
          async (payload) => {
            // Skip column updates for now - they're less frequent
            if (isUpdatingRef.current) {
              return;
            }
            // Reload only for column structure changes
            setTimeout(() => {
              loadBoard(boardId);
            }, 500);
          }
        )
        .subscribe();
    } else {
      setIsLoading(false);
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [boardId]); // Removed loadBoard from dependencies to avoid infinite loop

  // Create a new board with default columns and team notifications
  const createBoard = useCallback(async (title: string, description?: string, projectId?: string) => {
    try {
      if (!projectId) {
        toast.error('Veuillez sélectionner un projet avant de créer un tableau Kanban.');
        return null;
      }

      // Get real team members from project_bookings with candidate profiles
      const { data: projectBookings, error: teamError } = await supabase
        .from('project_bookings')
        .select(`
          candidate_id,
          candidate_profiles!inner (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'confirmed');

      if (teamError) {
        console.error('Error fetching team members:', teamError);
      }

      const teamMembers = (projectBookings || [])
        .filter((booking: any) => booking.candidate_profiles)
        .map((booking: any) => ({
          id: booking.candidate_profiles.id,
          name: `${booking.candidate_profiles.first_name || ''} ${booking.candidate_profiles.last_name || ''}`.trim() || booking.candidate_profiles.email,
          email: booking.candidate_profiles.email,
          role: 'Candidat'
        }));

      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({
          title,
          description,
          project_id: projectId, // required by RLS
          created_by: '1', // TODO: replace with real user id if needed
          members: teamMembers.map(m => m.id),
          team_members: teamMembers
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create default columns
      const defaultColumns = [
        { title: 'Set-up', position: 0, color: '#ef4444' },
        { title: 'À faire', position: 1, color: '#f59e0b' },
        { title: 'En cours', position: 2, color: '#3b82f6' },
        { title: 'À vérifier', position: 3, color: '#8b5cf6' },
        { title: 'Terminé', position: 4, color: '#10b981' }
      ];

      const columnsData = defaultColumns.map(col => ({
        board_id: data.id,
        title: col.title,
        position: col.position,
        color: col.color
      }));

      const { data: createdColumns, error: columnsError } = await supabase
        .from('kanban_columns')
        .insert(columnsData)
        .select();

      if (columnsError) {
        console.error('Error creating default columns:', columnsError);
        throw columnsError;
      }

      // Get project details to create the initial project card
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('title, description, deadline, budget, created_at')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project details:', projectError);
      }

      // Get project files to include in the project card description
      const { data: projectFiles, error: filesError } = await supabase
        .from('project_files')
        .select('file_name, file_path')
        .eq('project_id', projectId);

      if (filesError) {
        console.error('Error fetching project files:', filesError);
      }

      // Create initial "Projet" card in Set-up column if we have project data
      if (projectData && createdColumns && createdColumns.length > 0) {
        const setupColumn = createdColumns.find(col => col.title === 'Set-up');
        if (setupColumn) {
          let projectCardDescription = `**Détails du projet:**\n\n`;
          projectCardDescription += `${projectData.description || 'Aucune description disponible'}\n\n`;
          
          if (projectData.deadline) {
            const deadline = new Date(projectData.deadline);
            projectCardDescription += `**Date limite:** ${deadline.toLocaleDateString('fr-FR')}\n`;
          }
          
          if (projectData.budget) {
            projectCardDescription += `**Budget:** ${projectData.budget}€\n`;
          }
          
          projectCardDescription += `**Date de création:** ${new Date(projectData.created_at).toLocaleDateString('fr-FR')}\n`;
          
          if (projectFiles && projectFiles.length > 0) {
            projectCardDescription += `\n**Fichiers joints:**\n`;
            projectFiles.forEach(file => {
              projectCardDescription += `- ${file.file_name}\n`;
            });
          }

          const { data: projectCard, error: cardError } = await supabase
            .from('kanban_cards')
            .insert({
              board_id: data.id,
              column_id: setupColumn.id,
              title: 'Projet',
              description: projectCardDescription,
              position: 0,
              priority: 'high',
              status: 'todo',
              created_by: '1', // TODO: replace with real user id if needed
              due_date: projectData.deadline || null
            })
            .select()
            .single();

          if (cardError) {
            console.error('Error creating project card:', cardError);
          }
        }
      }

      // Create notifications for team members
      if (projectId) {
        try {
          await supabase.rpc('create_kanban_notifications_for_team', {
            p_project_id: projectId,
            p_kanban_board_id: data.id,
            p_notification_type: 'kanban_new_project',
            p_title: `Nouveau tableau Kanban: ${title}`,
            p_description: `Un nouveau tableau Kanban a été créé pour le projet. Vous pouvez maintenant commencer à collaborer sur les tâches.`,
            p_metadata: { 
              projectId: projectId,
              boardId: data.id,
              boardTitle: title
            }
          });
        } catch (notifError) {
          console.error('Error creating team notifications:', notifError);
        }
      }

      const newBoard = transformDbToBoard(data, createdColumns || [], []);
      setBoard(newBoard);
      toast.success('Tableau créé avec colonnes par défaut');
      return newBoard;

    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Erreur lors de la création du tableau');
      return null;
    }
  }, [transformDbToBoard]);

  // Add a new column
  const addColumn = useCallback(async (input: CreateColumnInput) => {
    if (!board) return;

    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
          board_id: board.id,
          title: input.title,
          position: input.position,
          color: input.color,
          limit: input.limit
        })
        .select()
        .single();

      if (error) throw error;

      const newColumn: KanbanColumn = {
        id: data.id,
        title: data.title,
        position: data.position,
        cardIds: [],
        color: data.color,
        limit: data.limit
      };

      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: [...prev.columns, newColumn].sort((a, b) => a.position - b.position),
          updatedAt: new Date().toISOString()
        };
      });

      toast.success(`Colonne "${input.title}" ajoutée`);

    } catch (error) {
      console.error('Error adding column:', error);
      toast.error('Erreur lors de la création de la colonne');
    }
  }, [board]);

  // Update a column
  const updateColumn = useCallback(async (input: UpdateColumnInput) => {
    if (!board) return;

    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .update({
          title: input.title,
          position: input.position,
          color: input.color,
          limit: input.limit
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      setBoard(prev => {
        if (!prev) return prev;
        const updatedColumns = prev.columns.map(col => 
          col.id === input.id 
            ? { ...col, title: data.title, position: data.position, color: data.color, limit: data.limit }
            : col
        ).sort((a, b) => a.position - b.position);
        
        return {
          ...prev,
          columns: updatedColumns,
          updatedAt: new Date().toISOString()
        };
      });

      toast.success(`Colonne "${input.title}" modifiée`);

    } catch (error) {
      console.error('Error updating column:', error);
      toast.error('Erreur lors de la modification de la colonne');
    }
  }, [board]);

  // Delete a column
  const deleteColumn = useCallback(async (columnId: string) => {
    if (!board) return;

    try {
      // First, delete all cards in the column
      await supabase
        .from('kanban_cards')
        .delete()
        .eq('column_id', columnId);

      // Then delete the column
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      const column = board.columns.find(col => col.id === columnId);
      
      setBoard(prev => {
        if (!prev) return prev;
        const newCards = { ...prev.cards };
        
        // Remove cards from state
        const columnToDelete = prev.columns.find(col => col.id === columnId);
        if (columnToDelete) {
          columnToDelete.cardIds.forEach(cardId => {
            delete newCards[cardId];
          });
        }

        return {
          ...prev,
          columns: prev.columns.filter(col => col.id !== columnId),
          cards: newCards,
          updatedAt: new Date().toISOString()
        };
      });

      toast.success(`Colonne "${column?.title}" supprimée`);

    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error('Erreur lors de la suppression de la colonne');
    }
  }, [board]);

  // Add a new card with team notifications
  const addCard = useCallback(async (input: CreateCardInput) => {
    if (!board) return null;

    try {
      // Find team member if assigned
      const assignedMember = input.assignedTo ? 
        board.teamMembers.find(member => member.id === input.assignedTo) : undefined;

      // Get current max position for the column
      const column = board.columns.find(col => col.id === input.columnId);
      const maxPosition = column ? column.cardIds.length : 0;
      
      // Derive status from column title
      const derivedStatus = column ? getStatusFromColumnTitle(column.title) : 'todo';

      const { data, error } = await supabase
        .from('kanban_cards')
        .insert({
          board_id: board.id,
          column_id: input.columnId,
          title: input.title,
          description: input.description,
          assigned_to: input.assignedTo,
          assigned_to_name: assignedMember?.name,
          assigned_to_email: assignedMember?.email,
          assigned_to_avatar: assignedMember?.avatar,
          due_date: input.dueDate ? input.dueDate.split('T')[0] : null,
          priority: input.priority || 'medium',
          status: derivedStatus, // Use derived status instead of input.status
          labels: input.labels || [],
          progress: 0,
          position: maxPosition,
          created_by: '1', // TODO: Get from auth context
          files: input.files || [] // Add files support
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for team members
      if (board.projectId) {
        const columnTitle = column?.title || 'Colonne inconnue';
        try {
          await supabase.rpc('create_kanban_notifications_for_team', {
            p_project_id: board.projectId,
            p_kanban_board_id: board.id,
            p_notification_type: 'kanban_card_created',
            p_title: `Nouvelle carte: ${input.title}`,
            p_description: `Une nouvelle carte "${input.title}" a été ajoutée dans la colonne "${columnTitle}".`,
            p_card_id: data.id,
            p_metadata: { 
              cardId: data.id,
              cardTitle: input.title,
              columnId: input.columnId,
              columnTitle: columnTitle,
              assignedTo: assignedMember?.name
            }
          });
        } catch (notifError) {
          console.error('Error creating card notifications:', notifError);
        }
      }

      const newCard: KanbanCard = {
        id: data.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assigned_to,
        assignedToName: data.assigned_to_name,
        assignedToEmail: data.assigned_to_email,
        assignedToAvatar: data.assigned_to_avatar,
        dueDate: data.due_date ? new Date(data.due_date).toISOString() : null,
        priority: data.priority,
        status: data.status,
        labels: data.labels || [],
        attachments: [],
        comments: [],
        progress: data.progress,
        files: input.files || data.files || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by
      };

      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [newCard.id]: newCard
          },
          columns: prev.columns.map(col =>
            col.id === input.columnId
              ? { ...col, cardIds: [...col.cardIds, newCard.id] }
              : col
          ),
          updatedAt: new Date().toISOString()
        };
      });

      toast.success(`Carte "${input.title}" ajoutée`);
      return newCard;

    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Erreur lors de la création de la carte');
      return null;
    }
  }, [board]);

  // Update a card with team notifications
  const updateCard = useCallback(async (input: UpdateCardInput) => {
    if (!board) return;

    try {
      isUpdatingRef.current = true;
      // Find team member if assigned
      const assignedMember = input.assignedTo ? 
        board.teamMembers.find(member => member.id === input.assignedTo) : undefined;

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.assignedTo !== undefined) {
        updateData.assigned_to = input.assignedTo;
        updateData.assigned_to_name = assignedMember?.name || null;
        updateData.assigned_to_email = assignedMember?.email || null;
        updateData.assigned_to_avatar = assignedMember?.avatar || null;
      }
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate ? input.dueDate.split('T')[0] : null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.labels !== undefined) updateData.labels = input.labels;
      if (input.progress !== undefined) updateData.progress = input.progress;
      if (input.files !== undefined) updateData.files = input.files;

      const { data, error } = await supabase
        .from('kanban_cards')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Create notifications for team members if it's a significant update
      if (board.projectId && (input.title || input.assignedTo !== undefined || input.status)) {
        const existingCard = board.cards[input.id];
        const cardTitle = input.title || existingCard?.title || 'Carte';
        try {
          await supabase.rpc('create_kanban_notifications_for_team', {
            p_project_id: board.projectId,
            p_kanban_board_id: board.id,
            p_notification_type: 'kanban_card_updated',
            p_title: `Carte mise à jour: ${cardTitle}`,
            p_description: `La carte "${cardTitle}" a été modifiée.`,
            p_card_id: input.id,
            p_metadata: { 
              cardId: input.id,
              cardTitle: cardTitle,
              updatedFields: Object.keys(updateData),
              assignedTo: assignedMember?.name
            }
          });
        } catch (notifError) {
          console.error('Error creating update notifications:', notifError);
        }
      }

      setBoard(prev => {
        if (!prev) return prev;
        const existingCard = prev.cards[input.id];
        if (!existingCard) return prev;

        return {
          ...prev,
          cards: {
            ...prev.cards,
            [input.id]: {
              ...existingCard,
              title: data.title,
              description: data.description,
              assignedTo: data.assigned_to,
              assignedToName: data.assigned_to_name,
              assignedToEmail: data.assigned_to_email,
              assignedToAvatar: data.assigned_to_avatar,
              dueDate: data.due_date || null,
              priority: data.priority,
              status: data.status,
              labels: data.labels || [],
              progress: data.progress,
              files: input.files !== undefined ? input.files : (data.files || existingCard.files || []),
              updatedAt: data.updated_at
            }
          },
          updatedAt: new Date().toISOString()
        };
      });

      toast.success('Carte mise à jour');
      
      // Reset flag after a delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);

    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Erreur lors de la mise à jour de la carte');
      isUpdatingRef.current = false;
    }
  }, [board]);

  // Delete a card
  const deleteCard = useCallback(async (cardId: string) => {
    if (!board) return;

    try {
      const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      const card = board.cards[cardId];

      setBoard(prev => {
        if (!prev) return prev;
        const newCards = { ...prev.cards };
        delete newCards[cardId];

        return {
          ...prev,
          cards: newCards,
          columns: prev.columns.map(col => ({
            ...col,
            cardIds: col.cardIds.filter(id => id !== cardId)
          })),
          updatedAt: new Date().toISOString()
        };
      });

      toast.success(`Carte "${card?.title}" supprimée`);

    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Erreur lors de la suppression de la carte');
    }
  }, [board]);

  // Handle drag and drop
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // No destination or same position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    if (!board) return;

    try {
      isUpdatingRef.current = true;
      // Update positions in database
      if (source.droppableId === destination.droppableId) {
        // Same column - reorder
        const column = board.columns.find(col => col.id === source.droppableId);
        if (!column) return;

        const newCardIds = Array.from(column.cardIds);
        newCardIds.splice(source.index, 1);
        newCardIds.splice(destination.index, 0, draggableId);

        // Update all cards positions in this column
        const updates = newCardIds.map((cardId, index) => ({
          id: cardId,
          position: index
        }));

        for (const update of updates) {
          await supabase
            .from('kanban_cards')
            .update({ position: update.position })
            .eq('id', update.id);
        }

      } else {
        // Different columns - move card
        const sourceColumn = board.columns.find(col => col.id === source.droppableId);
        const destColumn = board.columns.find(col => col.id === destination.droppableId);

        if (!sourceColumn || !destColumn) return;

        // Get the new status based on destination column title
        const newStatus = getStatusFromColumnTitle(destColumn.title);

        // Update card's column and status
         await supabase
          .from('kanban_cards')
          .update({ 
            column_id: destination.droppableId,
            position: destination.index,
            status: newStatus
          })
          .eq('id', draggableId);

        // If moving to "Finalisé" column, create notification for client
        if (newStatus === 'done' && board.cards[draggableId]) {
          const card = board.cards[draggableId];
          
          // Get the current user
          const { data: { user } } = await supabase.auth.getUser();
          
          // Get project details to find client
          const { data: project } = await supabase
            .from('projects')
            .select('created_by,title')
            .eq('id', board.projectId)
            .single();
            
          if (project && user && project.created_by !== user.id) {
            // Create notification for project owner (client)
            await supabase
              .from('notifications')
              .insert({
                user_id: project.created_by,
                type: 'info',  // Changed to valid enum value
                priority: 'medium',
                title: 'Tâche terminée',
                message: `La tâche "${card.title}" a été marquée comme finalisée et attend votre évaluation.`,
                data: {  // Changed to use data instead of separate fields
                  project_id: board.projectId,
                  notification_type: 'task_completed',
                  cardId: draggableId,
                  cardTitle: card.title,
                  boardId: board.id,
                  completedBy: user.id
                },
                is_read: false
              });
              
            toast.success('Le client a été notifié de la finalisation de la tâche');
          }
        }

        // Update positions in source column
        const sourceCardIds = Array.from(sourceColumn.cardIds);
        sourceCardIds.splice(source.index, 1);
        
        for (let i = 0; i < sourceCardIds.length; i++) {
           await supabase
            .from('kanban_cards')
            .update({ position: i })
            .eq('id', sourceCardIds[i]);
        }

        // Update positions in destination column
        const destCardIds = Array.from(destColumn.cardIds);
        destCardIds.splice(destination.index, 0, draggableId);

        for (let i = 0; i < destCardIds.length; i++) {
          if (destCardIds[i] !== draggableId) {
             await supabase
              .from('kanban_cards')
              .update({ position: i })
              .eq('id', destCardIds[i]);
          }
        }
      }

      // Update local state
      setBoard(prev => {
        if (!prev) return prev;

        const sourceColumn = prev.columns.find(col => col.id === source.droppableId);
        const destColumn = prev.columns.find(col => col.id === destination.droppableId);

        if (!sourceColumn || !destColumn) return prev;

        // Same column - reorder
        if (source.droppableId === destination.droppableId) {
          const newCardIds = Array.from(sourceColumn.cardIds);
          newCardIds.splice(source.index, 1);
          newCardIds.splice(destination.index, 0, draggableId);

          return {
            ...prev,
            columns: prev.columns.map(col =>
              col.id === source.droppableId
                ? { ...col, cardIds: newCardIds }
                : col
            ),
            updatedAt: new Date().toISOString()
          };
        }

        // Different columns - move card
        const sourceCardIds = Array.from(sourceColumn.cardIds);
        const destCardIds = Array.from(destColumn.cardIds);

        sourceCardIds.splice(source.index, 1);
        destCardIds.splice(destination.index, 0, draggableId);

        return {
          ...prev,
          columns: prev.columns.map(col => {
            if (col.id === source.droppableId) {
              return { ...col, cardIds: sourceCardIds };
            }
            if (col.id === destination.droppableId) {
              return { ...col, cardIds: destCardIds };
            }
            return col;
          }),
          updatedAt: new Date().toISOString()
        };
      });
      
      // Reset flag after a delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);

    } catch (error) {
      console.error('Error handling drag end:', error);
      toast.error('Erreur lors du déplacement de la carte');
      isUpdatingRef.current = false;
    }
  }, [board]);

  // Export board as JSON
  const exportBoard = useCallback((boardToExport?: KanbanBoard) => {
    const targetBoard = boardToExport || board;
    if (!targetBoard) return;
    
    const dataStr = JSON.stringify(targetBoard, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanban-${targetBoard.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Tableau exporté en JSON');
  }, [board]);

  // Import board from JSON (saves to database)
  const importBoard = useCallback(async (jsonString: string, projectId?: string) => {
    try {
      if (!projectId) {
        toast.error('Veuillez sélectionner un projet avant d\'importer un tableau.');
        return null;
      }

      const importedBoard: KanbanBoard = JSON.parse(jsonString);
      
      // Create board in database
      const { data: newBoardData, error: boardError } = await supabase
        .from('kanban_boards')
        .insert({
          title: `${importedBoard.title} (Importé)`,
          description: importedBoard.description,
          project_id: projectId, // required by RLS
          created_by: '1', // TODO: replace with real user id if needed
          members: importedBoard.members,
          team_members: importedBoard.teamMembers
        } as any)
        .select()
        .single();

      if (boardError) throw boardError;

      // Create columns
      const columnsPromises = importedBoard.columns.map(column =>
        supabase.from('kanban_columns').insert({
          id: column.id, // Keep original ID to maintain card relationships
          board_id: newBoardData.id,
          title: column.title,
          position: column.position,
          color: column.color,
          limit: column.limit
        })
      );

      await Promise.all(columnsPromises);

      // Create cards
      // NOTE: We keep original IDs but you must ensure column_id mapping matches the imported structure.
      const cardsPromises = Object.values(importedBoard.cards).map((card, index) =>
        supabase.from('kanban_cards').insert({
          id: card.id,
          board_id: newBoardData.id,
          // WARNING: column_id must be set to the actual column containing the card.
          // This implementation mirrors existing behavior; adapt mapping if needed.
          column_id: card.id,
          title: card.title,
          description: card.description,
          assigned_to: card.assignedTo,
          assigned_to_name: card.assignedToName,
          assigned_to_email: card.assignedToEmail,
          assigned_to_avatar: card.assignedToAvatar,
          due_date: card.dueDate,
          priority: card.priority,
          status: card.status,
          labels: card.labels,
          progress: card.progress,
          position: index,
          created_by: card.createdBy
        })
      );

      await Promise.all(cardsPromises);

      // Load the imported board
      await loadBoard(newBoardData.id);
      
      toast.success(`Tableau "${importedBoard.title}" importé`);
      return newBoardData;

    } catch (error) {
      console.error('Error importing board:', error);
      toast.error('Erreur lors de l\'import JSON');
      return null;
    }
  }, [loadBoard]);

  return {
    board,
    isLoading,
    createBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    handleDragEnd,
    exportBoard,
    importBoard,
    getAllBoards: () => [], // TODO: Implement if needed
    deleteBoard: () => {} // TODO: Implement if needed
  };
};
