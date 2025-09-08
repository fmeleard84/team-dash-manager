import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageCircle,
  Send,
  Check,
  Reply,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Comment {
  id: string;
  page_id: string;
  author_id: string;
  author_name?: string;
  author_email?: string;
  parent_comment_id: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

interface WikiCommentsProps {
  pageId: string;
  isPagePublic: boolean;
  currentUserId: string | null;
  onCommentCountChange?: (count: number) => void;
}

export default function WikiComments({ pageId, isPagePublic, currentUserId, onCommentCountChange }: WikiCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (pageId && isPagePublic) {
      loadComments();
      subscribeToComments();
    }
  }, [pageId, isPagePublic]);

  const subscribeToComments = () => {
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
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wiki_comments_with_authors')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organiser les commentaires en arbre
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data || []).forEach(comment => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      (data || []).forEach(comment => {
        const commentNode = commentsMap.get(comment.id)!;
        if (comment.parent_comment_id && commentsMap.has(comment.parent_comment_id)) {
          const parent = commentsMap.get(comment.parent_comment_id)!;
          parent.replies = parent.replies || [];
          parent.replies.push(commentNode);
        } else if (!comment.parent_comment_id) {
          rootComments.push(commentNode);
        }
      });

      setComments(rootComments);
      
      // Notifier le nombre total de commentaires
      if (onCommentCountChange) {
        onCommentCountChange(data?.length || 0);
      }
      
      // Auto-expand comments with replies
      const commentsWithReplies = new Set<string>();
      rootComments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          commentsWithReplies.add(comment.id);
        }
      });
      setExpandedComments(commentsWithReplies);
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('wiki_comments')
        .insert({
          page_id: pageId,
          author_id: currentUserId,
          parent_comment_id: replyTo,
          content: newComment.trim(),
        });

      if (error) throw error;

      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été publié",
      });

      setNewComment('');
      setReplyTo(null);
      loadComments();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive",
      });
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from('wiki_comments')
        .update({ content: editingContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Commentaire modifié",
        description: "Votre commentaire a été mis à jour",
      });

      setEditingId(null);
      setEditingContent('');
      loadComments();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le commentaire",
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

    try {
      const { error } = await supabase
        .from('wiki_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Commentaire supprimé",
        description: "Le commentaire a été supprimé",
      });

      loadComments();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
    }
  };

  const toggleResolve = async (commentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('wiki_comments')
        .update({ is_resolved: !currentStatus })
        .eq('id', commentId);

      if (error) throw error;

      loadComments();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const renderComment = (comment: Comment, level = 0) => {
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isAuthor = comment.author_id === currentUserId;
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-8 mt-2' : 'mb-4'}`}>
        <div className={`p-3 pb-6 rounded-lg border relative ${comment.is_resolved ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {comment.author_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.author_name || 'Utilisateur'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                  </span>
                  {comment.is_resolved && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Résolu</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {isAuthor && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleResolve(comment.id, comment.is_resolved)}
                        title={comment.is_resolved ? "Marquer comme non résolu" : "Marquer comme résolu"}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditingContent(comment.content);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateComment(comment.id)}>
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingId(null);
                      setEditingContent('');
                    }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 text-xs"
                    onClick={() => setReplyTo(comment.id)}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Répondre
                  </Button>
                </>
              )}
              
              {replyTo === comment.id && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Votre réponse..."
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addComment}>
                      <Send className="h-3 w-3 mr-1" />
                      Répondre
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setReplyTo(null);
                      setNewComment('');
                    }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bouton pour plier/déplier les réponses - en bas à gauche de la bulle */}
          {hasReplies && (
            <button
              onClick={() => toggleExpanded(comment.id)}
              className="absolute bottom-1 left-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Masquer {comment.replies?.length} réponse{comment.replies?.length > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>Voir {comment.replies?.length} réponse{comment.replies?.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {isExpanded && hasReplies && (
          <div className="mt-2">
            {comment.replies?.map(reply => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isPagePublic) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Les commentaires ne sont disponibles que sur les pages publiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Commentaires ({comments.length})
        </h3>
      </div>

      {currentUserId && !replyTo && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="min-h-[80px]"
          />
          <Button onClick={addComment} disabled={!newComment.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Publier
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Chargement des commentaires...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun commentaire pour le moment</p>
          <p className="text-sm mt-1">Soyez le premier à commenter cette page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
}