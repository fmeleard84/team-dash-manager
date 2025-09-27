import { useState, useEffect, useCallback } from 'react';
import { KanbanAPI } from '../services/kanbanAPI';
import type { KanbanComment } from '../types';

export const useKanbanComments = (cardId: string) => {
  const [comments, setComments] = useState<KanbanComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState(false);

  const loadComments = useCallback(async () => {
    if (!cardId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useKanbanComments] Loading comments for card:', cardId);
      const data = await KanbanAPI.getCardComments(cardId);
      setComments(data);
      console.log('✅ [useKanbanComments] Loaded comments:', data.length);
    } catch (err) {
      console.error('❌ [useKanbanComments] Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  const addComment = useCallback(async (content: string): Promise<boolean> => {
    if (!cardId || !content.trim()) return false;

    try {
      setAddingComment(true);
      setError(null);
      console.log('📝 [useKanbanComments] Adding comment to card:', cardId);
      const newComment = await KanbanAPI.addComment(cardId, content);
      setComments(prev => [...prev, newComment]);
      console.log('✅ [useKanbanComments] Comment added:', newComment.id);
      return true;
    } catch (err) {
      console.error('❌ [useKanbanComments] Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return false;
    } finally {
      setAddingComment(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return {
    comments,
    loading,
    error,
    addingComment,
    addComment,
    refetch: loadComments
  };
};