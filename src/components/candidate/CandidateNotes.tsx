import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CandidateNotesProps {
  currentCandidateId: string;
}

export function CandidateNotes({ currentCandidateId }: CandidateNotesProps) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['candidate-reviews', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_reviews')
        .select(`
          *,
          projects(title)
        `)
        .eq('candidate_id', currentCandidateId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div>Chargement des avis...</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes notes clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun avis client pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes notes clients</h2>
      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {review.projects?.title || 'Projet'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <StarRating rating={review.client_rating} />
              </div>
            </CardHeader>
            {review.client_comment && (
              <CardContent>
                <p className="text-sm">{review.client_comment}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}