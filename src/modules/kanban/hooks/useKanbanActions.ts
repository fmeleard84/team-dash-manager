import { useState, useCallback } from 'react';
import { KanbanAPI } from '../services/kanbanAPI';
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  CreateBoardData,
  UpdateBoardData,
  CreateColumnData,
  UpdateColumnData,
  CreateCardData,
  UpdateCardData,
  MoveCardData
} from '../types';

export const useKanbanActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Board Actions
  const createBoard = useCallback(async (data: CreateBoardData): Promise<KanbanBoard | null> => {
    try {
      setLoading(true);
      setError(null);
      const board = await KanbanAPI.createBoard(data);
      console.log('✅ [useKanbanActions] Board created:', board.id);
      return board;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error creating board:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBoard = useCallback(async (
    boardId: string,
    updates: UpdateBoardData
  ): Promise<KanbanBoard | null> => {
    try {
      setLoading(true);
      setError(null);
      const board = await KanbanAPI.updateBoard(boardId, updates);
      console.log('✅ [useKanbanActions] Board updated:', board.id);
      return board;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error updating board:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteBoard = useCallback(async (boardId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await KanbanAPI.deleteBoard(boardId);
      console.log('✅ [useKanbanActions] Board deleted:', boardId);
      return true;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error deleting board:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Column Actions
  const createColumn = useCallback(async (data: CreateColumnData): Promise<KanbanColumn | null> => {
    try {
      setLoading(true);
      setError(null);
      const column = await KanbanAPI.createColumn(data);
      console.log('✅ [useKanbanActions] Column created:', column.id);
      return column;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error creating column:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateColumn = useCallback(async (
    columnId: string,
    updates: UpdateColumnData
  ): Promise<KanbanColumn | null> => {
    try {
      setLoading(true);
      setError(null);
      const column = await KanbanAPI.updateColumn(columnId, updates);
      console.log('✅ [useKanbanActions] Column updated:', column.id);
      return column;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error updating column:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteColumn = useCallback(async (columnId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await KanbanAPI.deleteColumn(columnId);
      console.log('✅ [useKanbanActions] Column deleted:', columnId);
      return true;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error deleting column:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Card Actions
  const createCard = useCallback(async (data: CreateCardData): Promise<KanbanCard | null> => {
    try {
      setLoading(true);
      setError(null);
      const card = await KanbanAPI.createCard(data);
      console.log('✅ [useKanbanActions] Card created:', card.id);
      return card;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error creating card:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCard = useCallback(async (
    cardId: string,
    updates: UpdateCardData
  ): Promise<KanbanCard | null> => {
    try {
      setLoading(true);
      setError(null);
      const card = await KanbanAPI.updateCard(cardId, updates);
      console.log('✅ [useKanbanActions] Card updated:', card.id);
      return card;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error updating card:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const moveCard = useCallback(async (moveData: MoveCardData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await KanbanAPI.moveCard(moveData);
      console.log('✅ [useKanbanActions] Card moved:', moveData.cardId);
      return true;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error moving card:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du déplacement');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await KanbanAPI.deleteCard(cardId);
      console.log('✅ [useKanbanActions] Card deleted:', cardId);
      return true;
    } catch (err) {
      console.error('❌ [useKanbanActions] Error deleting card:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Board actions
    createBoard,
    updateBoard,
    deleteBoard,

    // Column actions
    createColumn,
    updateColumn,
    deleteColumn,

    // Card actions
    createCard,
    updateCard,
    moveCard,
    deleteCard,

    // State
    loading,
    error,
    clearError
  };
};