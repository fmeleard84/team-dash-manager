import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  projectId: string;
  candidateId?: string;
  onRatingSubmitted?: () => void;
}

export function TaskRatingDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  projectId,
  candidateId,
  onRatingSubmitted
}: TaskRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if already rated
  useEffect(() => {
    const checkExistingRating = async () => {
      if (!open || !taskId) return;
      
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('task_ratings')
        .select('*')
        .eq('task_id', taskId)
        .eq('client_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing rating:', error);
      }
        
      if (data) {
        setExistingRating(data);
        setRating(data.rating);
        setComment(data.comment || '');
      }
      setLoading(false);
    };
    
    checkExistingRating();
  }, [open, taskId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtenir l'ID de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      // Enregistrer la notation
      const { error } = await supabase
        .from('task_ratings')
        .insert({
          task_id: taskId,
          project_id: projectId,
          candidate_id: candidateId,
          client_id: user.id,
          rating,
          comment: comment.trim() || null
        });

      if (error) {
        // Si l'erreur est due à une notation déjà existante
        if (error.code === '23505') {
          toast.error("Vous avez déjà noté cette tâche");
        } else {
          throw error;
        }
      } else {
        toast.success("Merci pour votre évaluation !");
        
        // Créer une notification pour le candidat
        if (candidateId && projectId) {
          try {
            // Obtenir le user_id du candidat
            const { data: candidateProfile } = await supabase
              .from('candidate_profiles')
              .select('user_id')
              .eq('id', candidateId)
              .single();
            
            if (candidateProfile?.user_id) {
              // Obtenir le nom du projet
              const { data: project } = await supabase
                .from('projects')
                .select('title')
                .eq('id', projectId)
                .single();
              
              // Créer la notification
              await supabase
                .from('notifications')
                .insert({
                  user_id: candidateProfile.user_id,
                  type: 'success',  // Changed to valid enum value
                  priority: 'high',
                  title: 'Nouvelle évaluation reçue',
                  message: `Vous avez reçu une évaluation pour la tâche "${taskTitle}"${project ? ` du projet ${project.title}` : ''}`,
                  data: {
                    notification_type: 'task_rated',
                    task_id: taskId,
                    task_title: taskTitle,
                    project_id: projectId,
                    project_title: project?.title,
                    rating: rating,
                    has_comment: !!comment
                  },
                  created_at: new Date().toISOString()
                });
            }
          } catch (notifError) {
            console.error('Erreur lors de la création de la notification:', notifError);
            // Ne pas faire échouer l'opération si la notification échoue
          }
        }
        
        // Réinitialiser le formulaire
        setRating(0);
        setComment("");
        
        // Fermer le dialogue
        onOpenChange(false);
        
        // Callback optionnel
        onRatingSubmitted?.();
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la notation:", error);
      toast.error("Erreur lors de l'enregistrement de votre notation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return "Insuffisant";
      case 2: return "Moyen";
      case 3: return "Bien";
      case 4: return "Très bien";
      case 5: return "Excellent";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md shadow-xl">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-light">
            {existingRating ? 'Modifier la notation' : 'Noter le livrable'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Évaluez la qualité de : <span className="font-medium">{taskTitle}</span>
            {existingRating && (
              <div className="mt-2 text-sm text-amber-600">
                Vous avez déjà noté cette tâche. Vous pouvez consulter ou modifier votre évaluation.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          {/* Étoiles de notation */}
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="group transition-transform hover:scale-110"
                  disabled={isSubmitting}
                >
                  <Star 
                    className={cn(
                      "w-10 h-10 transition-all",
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-300"
                    )}
                  />
                </button>
              ))}
            </div>
            
            {/* Label de la note - Toujours visible avec hauteur fixe */}
            <div className="text-center h-6">
              <span className="text-sm font-medium text-gray-600">
                {(hoveredRating || rating) ? getRatingLabel(hoveredRating || rating) : 'À vous de jouer !'}
              </span>
            </div>
          </div>

          {/* Commentaire optionnel */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Commentaire (optionnel)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre retour sur cette tâche..."
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? "Envoi..." : "Valider la notation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}