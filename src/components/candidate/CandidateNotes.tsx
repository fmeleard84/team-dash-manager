import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';
import { ProjectSelectorNeon } from '@/components/ui/project-selector-neon';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCandidateProjectsOptimized } from '@/hooks/useCandidateProjectsOptimized';

interface CandidateNotesProps {
  currentCandidateId: string;
}

export function CandidateNotes({ currentCandidateId }: CandidateNotesProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { projects } = useCandidateProjectsOptimized();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['candidate-reviews', currentCandidateId, selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('candidate_reviews')
        .select(`
          *,
          projects(title)
        `)
        .eq('candidate_id', currentCandidateId)
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des avis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with unified modern design - Using Messages style selector */}
      <PageHeaderNeon
        icon={FileText}
        title="Notes clients"
        subtitle="Avis et évaluations de vos missions"
        projects={projects.map(p => ({ ...p, created_at: p.project_date || p.created_at }))}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        projectSelectorConfig={{
          placeholder: "Sélectionner un projet",
          showStatus: true,
          showDates: true,
          showTeamProgress: false,
          className: "w-[350px]"
        }}
      />

      {/* Content */}
      {!reviews || reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">
              {selectedProjectId
                ? "Aucun avis client pour ce projet."
                : "Aucun avis client pour le moment."}
            </p>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}