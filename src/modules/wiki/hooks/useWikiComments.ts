import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/ui/components/use-toast';
import { WikiAPI } from '../services/wikiAPI';
import {
  WikiComment,
  CreateWikiCommentData,
  WikiError,
  UseWikiCommentsReturn
} from '../types';

interface UseWikiCommentsOptions {
  pageId: string;
  autoRefresh?: boolean;
  realtime?: boolean;
}

export function useWikiComments({
  pageId,
  autoRefresh = false,
  realtime = true
}: UseWikiCommentsOptions): UseWikiCommentsReturn {
  const { toast } = useToast();

  // États
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WikiError | null>(null);

  // ID utilisateur actuel
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * Récupère l'utilisateur actuel
   */
  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    }
  }, []);

  /**
   * Charge les commentaires de la page
   */
  const loadComments = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await WikiAPI.getComments(pageId);

      if (response.success) {
        setComments(response.data);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des commentaires'
        });
      }
    } catch (err) {
      console.error('useWikiComments.loadComments:', err);
      setError({
        code: 'FETCH_ERROR',
        message: 'Impossible de charger les commentaires'
      });
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  /**
   * Ajoute un nouveau commentaire
   */
  const addComment = useCallback(async (data: CreateWikiCommentData): Promise<WikiComment> => {
    const response = await WikiAPI.addComment(data);

    if (response.success) {
      // Ajouter le commentaire à l'état local
      if (data.parent_comment_id) {
        // C'est une réponse - l'ajouter au bon parent
        setComments(prev =>
          prev.map(comment =>
            comment.id === data.parent_comment_id
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), response.data]
                }
              : comment
          )
        );
      } else {
        // C'est un commentaire racine
        setComments(prev => [response.data, ...prev]);
      }

      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été publié",
      });

      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible d'ajouter le commentaire",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Ajout impossible");
    }
  }, [toast]);

  /**
   * Met à jour un commentaire existant
   */
  const updateComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<WikiComment> => {
    const response = await WikiAPI.updateComment(commentId, content);

    if (response.success) {
      // Mettre à jour le commentaire dans l'état local
      const updateCommentInTree = (comments: WikiComment[]): WikiComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return response.data;
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentInTree(prev));

      toast({
        title: "Commentaire modifié",
        description: "Votre commentaire a été mis à jour",
      });

      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de modifier le commentaire",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Modification impossible");
    }
  }, [toast]);

  /**
   * Supprime un commentaire
   */
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    // Demander confirmation
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?');
    if (!confirmed) return;

    const response = await WikiAPI.deleteComment(commentId);

    if (response.success) {
      // Supprimer le commentaire de l'état local
      const removeCommentFromTree = (comments: WikiComment[]): WikiComment[] => {
        return comments.filter(comment => {
          if (comment.id === commentId) {
            return false;
          }
          if (comment.replies && comment.replies.length > 0) {
            comment.replies = removeCommentFromTree(comment.replies);
          }
          return true;
        });
      };

      setComments(prev => removeCommentFromTree(prev));

      toast({
        title: "Commentaire supprimé",
        description: "Le commentaire a été supprimé",
      });
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Marque un commentaire comme résolu
   */
  const resolveComment = useCallback(async (commentId: string): Promise<WikiComment> => {
    const response = await WikiAPI.toggleCommentResolved(commentId);

    if (response.success) {
      // Mettre à jour le commentaire dans l'état local
      const updateCommentInTree = (comments: WikiComment[]): WikiComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, is_resolved: true };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentInTree(prev));

      toast({
        title: "Commentaire résolu",
        description: "Le commentaire a été marqué comme résolu",
      });

      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de résoudre le commentaire",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Résolution impossible");
    }
  }, [toast]);

  /**
   * Marque un commentaire comme non résolu
   */
  const unresolveComment = useCallback(async (commentId: string): Promise<WikiComment> => {
    const response = await WikiAPI.toggleCommentResolved(commentId);

    if (response.success) {
      // Mettre à jour le commentaire dans l'état local
      const updateCommentInTree = (comments: WikiComment[]): WikiComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, is_resolved: false };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentInTree(prev));

      toast({
        title: "Commentaire rouvert",
        description: "Le commentaire a été marqué comme non résolu",
      });

      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de rouvrir le commentaire",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Réouverture impossible");
    }
  }, [toast]);

  /**
   * Recharge les commentaires
   */
  const refetch = loadComments;

  // Initialisation
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (pageId) {
      loadComments();
    }
  }, [pageId, loadComments]);

  // Auto-refresh périodique
  useEffect(() => {
    if (!autoRefresh || !pageId) return;

    const interval = setInterval(() => {
      loadComments();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, pageId, loadComments]);

  // Configuration du real-time
  useEffect(() => {
    if (!realtime || !pageId) return;

    const channel = supabase
      .channel(`wiki-comments-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wiki_comments',
          filter: `page_id=eq.${pageId}`
        },
        async (payload) => {
          console.log('Wiki comments realtime event:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouveau commentaire ajouté
            if (payload.new.author_id !== currentUserId) {
              // Recharger pour avoir les données complètes avec l'auteur
              await loadComments();

              toast({
                title: "Nouveau commentaire",
                description: "Un nouveau commentaire a été ajouté à cette page",
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Commentaire mis à jour
            if (payload.new.author_id !== currentUserId) {
              await loadComments();
            }
          } else if (payload.eventType === 'DELETE') {
            // Commentaire supprimé
            const removeCommentFromTree = (comments: WikiComment[]): WikiComment[] => {
              return comments.filter(comment => {
                if (comment.id === payload.old.id) {
                  return false;
                }
                if (comment.replies && comment.replies.length > 0) {
                  comment.replies = removeCommentFromTree(comment.replies);
                }
                return true;
              });
            };

            setComments(prev => removeCommentFromTree(prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime, pageId, currentUserId, loadComments, toast]);

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
    refetch
  };
}