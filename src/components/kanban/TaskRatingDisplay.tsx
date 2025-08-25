import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TaskRatingDisplayProps {
  taskId: string;
  showForCandidate?: boolean;
}

export function TaskRatingDisplay({ taskId, showForCandidate = false }: TaskRatingDisplayProps) {
  const [rating, setRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRating = async () => {
      if (!taskId) return;
      
      try {
        const { data, error } = await supabase
          .from('task_ratings')
          .select('*')
          .eq('task_id', taskId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching rating:', error);
        }
        
        if (data) {
          setRating(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [taskId]);

  if (loading || !rating) {
    return null;
  }

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
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-purple-200">
      <div className="text-sm font-medium text-gray-700 mb-2">Évaluation du client</div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "w-5 h-5",
                rating.rating >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-600">
          {getRatingLabel(rating.rating)}
        </span>
      </div>
      {rating.comment && (
        <div className="mt-3 text-sm text-gray-600">
          <div className="font-medium mb-1">Commentaire :</div>
          <div className="bg-white p-2 rounded border border-gray-200">
            {rating.comment}
          </div>
        </div>
      )}
    </div>
  );
}