import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Star } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Comment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: string;
  isRating?: boolean;
  rating?: number;
}

interface CardCommentsProps {
  comments: Comment[];
  onAddComment?: (text: string) => void;
  readOnly?: boolean;
}

export function CardComments({ comments = [], onAddComment, readOnly = false }: CardCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClient = user?.user_metadata?.role === 'client';

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    if (onAddComment) {
      setIsSubmitting(true);
      try {
        await onAddComment(newComment.trim());
        setNewComment('');
      } catch (error) {
        toast.error('Erreur lors de l\'ajout du commentaire');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MessageSquare className="w-4 h-4" />
        <span>Commentaires ({comments.length})</span>
      </div>

      {/* Comments list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun commentaire</p>
        ) : (
          comments.map((comment) => {
            const firstName = comment.author.split(' ')[0] || comment.author.split('@')[0] || 'U';
            const initials = firstName.substring(0, 2).toUpperCase();
            
            return (
              <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                    </span>
                    {comment.isRating && comment.rating && (
                      <div className="flex items-center gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < comment.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add comment form - only for clients and if not read-only */}
      {!readOnly && isClient && onAddComment && (
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="min-h-[80px] resize-none text-sm"
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Send className="w-3 h-3 mr-2" />
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Ctrl+Entrée pour envoyer</p>
        </div>
      )}

    </div>
  );
}