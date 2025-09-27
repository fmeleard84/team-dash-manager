import { supabase } from '@/integrations/supabase/client';
import type {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanComment,
  KanbanAttachment,
  KanbanActivity,
  KanbanStats,
  KanbanFilters,
  CreateBoardData,
  UpdateBoardData,
  CreateColumnData,
  UpdateColumnData,
  CreateCardData,
  UpdateCardData,
  MoveCardData,
  TeamMember
} from '../types';

export class KanbanAPI {
  /**
   * Récupère tous les boards d'un projet
   */
  static async getProjectBoards(projectId: string): Promise<KanbanBoard[]> {
    console.log('🔍 [KanbanAPI] Loading boards for project:', projectId);

    const { data, error } = await supabase
      .from('kanban_boards')
      .select(`
        id,
        title,
        description,
        project_id,
        created_by,
        created_at,
        updated_at,
        settings,
        is_archived,
        kanban_columns (
          id,
          title,
          position,
          color,
          limit,
          created_at,
          updated_at,
          is_collapsed
        ),
        kanban_cards (
          id,
          title,
          description,
          assigned_to,
          due_date,
          priority,
          status,
          labels,
          progress,
          created_at,
          updated_at,
          created_by,
          column_id,
          position,
          estimated_hours,
          actual_hours
        )
      `)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('created_at');

    if (error) {
      console.error('❌ [KanbanAPI] Error fetching boards:', error);
      throw error;
    }

    if (!data) return [];

    // Transformer les données pour correspondre à la structure attendue
    return data.map(board => this.transformBoardData(board));
  }

  /**
   * Récupère un board par son ID avec toutes ses données
   */
  static async getBoardById(boardId: string): Promise<KanbanBoard | null> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .select(`
        *,
        kanban_columns (
          *,
          kanban_cards (*)
        )
      `)
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('❌ [KanbanAPI] Error fetching board:', error);
      throw error;
    }

    return data ? this.transformBoardData(data) : null;
  }

  /**
   * Crée un nouveau board
   */
  static async createBoard(boardData: CreateBoardData): Promise<KanbanBoard> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .insert({
        title: boardData.title,
        description: boardData.description,
        project_id: boardData.projectId,
        settings: {
          allowComments: true,
          allowAttachments: true,
          allowVoting: false,
          cardCoverImages: true,
          showCardNumbers: true,
          enableDueDates: true,
          enableTimeTracking: true,
          wipLimits: false
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error creating board:', error);
      throw error;
    }

    // Créer les colonnes par défaut
    await this.createDefaultColumns(data.id);

    return this.transformBoardData(data);
  }

  /**
   * Met à jour un board
   */
  static async updateBoard(boardId: string, updates: UpdateBoardData): Promise<KanbanBoard> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .update({
        title: updates.title,
        description: updates.description,
        settings: updates.settings,
        is_archived: updates.isArchived,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error updating board:', error);
      throw error;
    }

    return this.transformBoardData(data);
  }

  /**
   * Supprime un board (soft delete)
   */
  static async deleteBoard(boardId: string): Promise<void> {
    const { error } = await supabase
      .from('kanban_boards')
      .update({ is_archived: true })
      .eq('id', boardId);

    if (error) {
      console.error('❌ [KanbanAPI] Error deleting board:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle colonne
   */
  static async createColumn(columnData: CreateColumnData): Promise<KanbanColumn> {
    // Récupérer la position suivante
    const { data: lastColumn } = await supabase
      .from('kanban_columns')
      .select('position')
      .eq('board_id', columnData.boardId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = columnData.position ?? (lastColumn?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        title: columnData.title,
        board_id: columnData.boardId,
        position,
        color: columnData.color,
        limit: columnData.limit
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error creating column:', error);
      throw error;
    }

    return this.transformColumnData(data);
  }

  /**
   * Met à jour une colonne
   */
  static async updateColumn(columnId: string, updates: UpdateColumnData): Promise<KanbanColumn> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .update({
        title: updates.title,
        position: updates.position,
        color: updates.color,
        limit: updates.limit,
        is_collapsed: updates.isCollapsed,
        updated_at: new Date().toISOString()
      })
      .eq('id', columnId)
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error updating column:', error);
      throw error;
    }

    return this.transformColumnData(data);
  }

  /**
   * Supprime une colonne
   */
  static async deleteColumn(columnId: string): Promise<void> {
    // Vérifier s'il y a des cartes dans la colonne
    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('id')
      .eq('column_id', columnId);

    if (cards && cards.length > 0) {
      throw new Error('Impossible de supprimer une colonne contenant des cartes');
    }

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId);

    if (error) {
      console.error('❌ [KanbanAPI] Error deleting column:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle carte
   */
  static async createCard(cardData: CreateCardData): Promise<KanbanCard> {
    // Récupérer la position suivante dans la colonne
    const { data: lastCard } = await supabase
      .from('kanban_cards')
      .select('position')
      .eq('column_id', cardData.columnId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (lastCard?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from('kanban_cards')
      .insert({
        title: cardData.title,
        description: cardData.description,
        column_id: cardData.columnId,
        board_id: cardData.boardId,
        assigned_to: cardData.assignedTo,
        priority: cardData.priority || 'medium',
        due_date: cardData.dueDate,
        labels: cardData.labels || [],
        estimated_hours: cardData.estimatedHours,
        position,
        status: 'todo',
        progress: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error creating card:', error);
      throw error;
    }

    return this.transformCardData(data);
  }

  /**
   * Met à jour une carte
   */
  static async updateCard(cardId: string, updates: UpdateCardData): Promise<KanbanCard> {
    const { data, error } = await supabase
      .from('kanban_cards')
      .update({
        title: updates.title,
        description: updates.description,
        assigned_to: updates.assignedTo,
        priority: updates.priority,
        status: updates.status,
        due_date: updates.dueDate,
        labels: updates.labels,
        progress: updates.progress,
        estimated_hours: updates.estimatedHours,
        actual_hours: updates.actualHours,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error updating card:', error);
      throw error;
    }

    return this.transformCardData(data);
  }

  /**
   * Déplace une carte entre colonnes ou dans la même colonne
   */
  static async moveCard(moveData: MoveCardData): Promise<void> {
    const { cardId, sourceColumnId, targetColumnId, newPosition } = moveData;

    // Si la carte change de colonne
    if (sourceColumnId !== targetColumnId) {
      // Mettre à jour la colonne de la carte
      const { error: updateError } = await supabase
        .from('kanban_cards')
        .update({
          column_id: targetColumnId,
          position: newPosition,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (updateError) throw updateError;
    } else {
      // Juste changer la position dans la même colonne
      const { error: updateError } = await supabase
        .from('kanban_cards')
        .update({
          position: newPosition,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (updateError) throw updateError;
    }

    // Réorganiser les positions des autres cartes
    await this.reorderCards(targetColumnId);
  }

  /**
   * Supprime une carte
   */
  static async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('❌ [KanbanAPI] Error deleting card:', error);
      throw error;
    }
  }

  /**
   * Récupère les commentaires d'une carte
   */
  static async getCardComments(cardId: string): Promise<KanbanComment[]> {
    const { data, error } = await supabase
      .from('kanban_comments')
      .select(`
        *,
        profiles (
          first_name,
          avatar
        )
      `)
      .eq('card_id', cardId)
      .order('created_at');

    if (error) {
      console.error('❌ [KanbanAPI] Error fetching comments:', error);
      throw error;
    }

    return data?.map(comment => ({
      id: comment.id,
      cardId: comment.card_id,
      userId: comment.user_id,
      userName: comment.profiles?.first_name || 'Utilisateur',
      userAvatar: comment.profiles?.avatar,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      mentions: comment.mentions || [],
      isEdited: comment.is_edited || false
    })) || [];
  }

  /**
   * Ajoute un commentaire à une carte
   */
  static async addComment(cardId: string, content: string): Promise<KanbanComment> {
    const { data, error } = await supabase
      .from('kanban_comments')
      .insert({
        card_id: cardId,
        content
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [KanbanAPI] Error adding comment:', error);
      throw error;
    }

    return {
      id: data.id,
      cardId: data.card_id,
      userId: data.user_id,
      userName: 'Vous',
      content: data.content,
      createdAt: data.created_at
    };
  }

  /**
   * Récupère les statistiques d'un board
   */
  static async getBoardStats(boardId: string): Promise<KanbanStats> {
    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('status, priority, assigned_to, due_date')
      .eq('board_id', boardId);

    if (!cards) {
      return {
        totalCards: 0,
        cardsByStatus: { todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0 },
        cardsByPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
        cardsByAssignee: {},
        averageCardsPerColumn: 0,
        completionRate: 0,
        overdueTasks: 0
      };
    }

    const totalCards = cards.length;
    const now = new Date();

    const cardsByStatus = cards.reduce((acc, card) => {
      acc[card.status] = (acc[card.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cardsByPriority = cards.reduce((acc, card) => {
      acc[card.priority] = (acc[card.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cardsByAssignee = cards.reduce((acc, card) => {
      if (card.assigned_to) {
        acc[card.assigned_to] = (acc[card.assigned_to] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const completionRate = totalCards > 0 ? (cardsByStatus.done || 0) / totalCards * 100 : 0;

    const overdueTasks = cards.filter(card =>
      card.due_date && new Date(card.due_date) < now && card.status !== 'done'
    ).length;

    return {
      totalCards,
      cardsByStatus: cardsByStatus as any,
      cardsByPriority: cardsByPriority as any,
      cardsByAssignee,
      averageCardsPerColumn: 0, // TODO: calculer après avoir récupéré les colonnes
      completionRate,
      overdueTasks
    };
  }

  /**
   * Récupère les membres d'équipe d'un board
   */
  static async getBoardMembers(boardId: string): Promise<TeamMember[]> {
    // Récupérer le project_id du board
    const { data: board } = await supabase
      .from('kanban_boards')
      .select('project_id')
      .eq('id', boardId)
      .single();

    if (!board?.project_id) return [];

    // Utiliser la logique existante pour récupérer les membres du projet
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        ),
        candidate_profiles (
          first_name,
          last_name,
          email
        ),
        profiles (
          first_name,
          email
        )
      `)
      .eq('project_id', board.project_id)
      .eq('booking_status', 'accepted');

    return assignments?.map(assignment => ({
      id: assignment.candidate_id || assignment.profile_id,
      name: assignment.candidate_profiles?.first_name ||
            assignment.profiles?.first_name ||
            assignment.hr_profiles?.name || 'Membre',
      email: assignment.candidate_profiles?.email ||
             assignment.profiles?.email || '',
      role: assignment.hr_profiles?.name || 'Membre',
      isAI: assignment.hr_profiles?.is_ai || false,
      promptId: assignment.hr_profiles?.prompt_id
    })) || [];
  }

  // Méthodes utilitaires privées
  private static transformBoardData(rawBoard: any): KanbanBoard {
    const columns = rawBoard.kanban_columns || [];
    const cards = rawBoard.kanban_cards || [];

    // Créer un mapping des cartes par ID
    const cardsMap = cards.reduce((acc: Record<string, KanbanCard>, card: any) => {
      acc[card.id] = this.transformCardData(card);
      return acc;
    }, {});

    // Transformer les colonnes et associer les cartes
    const transformedColumns = columns.map((column: any) => {
      const columnCards = cards.filter((card: any) => card.column_id === column.id);
      return {
        ...this.transformColumnData(column),
        cardIds: columnCards.map((card: any) => card.id)
      };
    });

    return {
      id: rawBoard.id,
      title: rawBoard.title,
      description: rawBoard.description,
      columns: transformedColumns,
      cards: cardsMap,
      projectId: rawBoard.project_id,
      createdBy: rawBoard.created_by,
      createdAt: rawBoard.created_at,
      updatedAt: rawBoard.updated_at,
      members: [], // TODO: récupérer depuis les assignments
      teamMembers: [], // TODO: récupérer les détails des membres
      settings: rawBoard.settings || {},
      isArchived: rawBoard.is_archived || false
    };
  }

  private static transformColumnData(rawColumn: any): KanbanColumn {
    return {
      id: rawColumn.id,
      title: rawColumn.title,
      position: rawColumn.position,
      cardIds: [], // Sera rempli par transformBoardData
      color: rawColumn.color,
      limit: rawColumn.limit,
      boardId: rawColumn.board_id,
      createdAt: rawColumn.created_at,
      updatedAt: rawColumn.updated_at,
      isCollapsed: rawColumn.is_collapsed || false
    };
  }

  private static transformCardData(rawCard: any): KanbanCard {
    return {
      id: rawCard.id,
      title: rawCard.title,
      description: rawCard.description,
      assignedTo: rawCard.assigned_to,
      dueDate: rawCard.due_date,
      priority: rawCard.priority,
      status: rawCard.status,
      labels: rawCard.labels || [],
      attachments: [], // TODO: récupérer les attachements
      comments: [], // TODO: récupérer les commentaires
      progress: rawCard.progress || 0,
      createdAt: rawCard.created_at,
      updatedAt: rawCard.updated_at,
      createdBy: rawCard.created_by,
      columnId: rawCard.column_id,
      position: rawCard.position,
      estimatedHours: rawCard.estimated_hours,
      actualHours: rawCard.actual_hours,
      files: [] // TODO: récupérer les fichiers
    };
  }

  private static async createDefaultColumns(boardId: string): Promise<void> {
    const defaultColumns = [
      { title: 'À faire', position: 1, color: '#6B7280' },
      { title: 'En cours', position: 2, color: '#3B82F6' },
      { title: 'En révision', position: 3, color: '#F59E0B' },
      { title: 'Terminé', position: 4, color: '#10B981' }
    ];

    for (const column of defaultColumns) {
      await supabase
        .from('kanban_columns')
        .insert({
          ...column,
          board_id: boardId
        });
    }
  }

  private static async reorderCards(columnId: string): Promise<void> {
    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('id')
      .eq('column_id', columnId)
      .order('position');

    if (cards) {
      for (let i = 0; i < cards.length; i++) {
        await supabase
          .from('kanban_cards')
          .update({ position: i + 1 })
          .eq('id', cards[i].id);
      }
    }
  }
}