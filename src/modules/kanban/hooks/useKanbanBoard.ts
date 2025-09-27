import { useState, useEffect, useCallback } from 'react';
import { KanbanAPI } from '../services/kanbanAPI';
import type { KanbanBoard, KanbanFilters } from '../types';

export const useKanbanBoard = (boardId: string) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    if (!boardId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useKanbanBoard] Loading board:', boardId);
      const data = await KanbanAPI.getBoardById(boardId);
      setBoard(data);
      console.log('✅ [useKanbanBoard] Board loaded:', data?.title);
    } catch (err) {
      console.error('❌ [useKanbanBoard] Error loading board:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  return {
    board,
    loading,
    error,
    refetch: loadBoard
  };
};

export const useProjectKanbanBoards = (projectId: string) => {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useProjectKanbanBoards] Loading boards for project:', projectId);
      const data = await KanbanAPI.getProjectBoards(projectId);
      setBoards(data);
      console.log('✅ [useProjectKanbanBoards] Loaded boards:', data.length);
    } catch (err) {
      console.error('❌ [useProjectKanbanBoards] Error loading boards:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  return {
    boards,
    loading,
    error,
    refetch: loadBoards
  };
};