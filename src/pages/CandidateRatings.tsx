import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MessageCircle, Calendar, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";

interface Rating {
  id: string;
  task_id: string;
  project_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  task_title?: string;
  project_title?: string;
}

interface Comment {
  id: string;
  card_id: string;
  project_id: string;
  content: string;
  created_at: string;
  created_by: string;
  card_title?: string;
  project_title?: string;
  author_name?: string;
}

export default function CandidateRatings() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const { projects } = useCandidateProjectsOptimized();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  // Charger les notes et commentaires
  useEffect(() => {
    const loadRatingsAndComments = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get candidate profile by email
        const { data: candidateProfile, error: profileError } = await supabase
          .from('candidate_profiles')
          .select('id, email, first_name, last_name')
          .eq('email', user.email || '')
          .single();

        if (!candidateProfile) {
          setLoading(false);
          return;
        }

        // D'abord essayer avec candidate_id
        
        let ratingsQuery = supabase
          .from('task_ratings')
          .select('*')
          .eq('candidate_id', candidateProfile.id)
          .order('created_at', { ascending: false });

        if (selectedProjectId !== "all") {
          ratingsQuery = ratingsQuery.eq('project_id', selectedProjectId);
        }

        let { data: ratingsData, error: ratingsError } = await ratingsQuery;
        
        // Si aucune note trouvée avec candidate_id, essayer via les projets
        if (!ratingsData || ratingsData.length === 0) {
          // Obtenir les projets du candidat
          const { data: assignments } = await supabase
            .from('hr_resource_assignments')
            .select('project_id')
            .eq('candidate_id', candidateProfile.id);
          
          const projectIds = assignments?.map(a => a.project_id) || [];
          
          if (projectIds.length > 0) {
            let fallbackQuery = supabase
              .from('task_ratings')
              .select('*')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false });
            
            if (selectedProjectId !== "all") {
              fallbackQuery = fallbackQuery.eq('project_id', selectedProjectId);
            }
            
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            
            if (!fallbackError && fallbackData) {
              ratingsData = fallbackData;
              ratingsError = null;
            }
          }
        }

        if (ratingsError) {
          console.error('Error loading ratings:', ratingsError);
        } else {
          // Charger les titres des tâches et projets séparément
          const formattedRatings = await Promise.all((ratingsData || []).map(async (r) => {
            let task_title = 'Tâche';
            let project_title = 'Projet';
            
            // Obtenir le titre de la tâche
            if (r.task_id) {
              const { data: card } = await supabase
                .from('kanban_cards')
                .select('title')
                .eq('id', r.task_id)
                .single();
              if (card) task_title = card.title;
            }
            
            // Obtenir le titre du projet
            if (r.project_id) {
              const { data: project } = await supabase
                .from('projects')
                .select('title')
                .eq('id', r.project_id)
                .single();
              if (project) project_title = project.title;
            }
            
            return {
              ...r,
              task_title,
              project_title
            };
          }));
          setRatings(formattedRatings);
        }

        // Les commentaires ne sont plus stockés dans kanban_cards
        // Pour le moment, on n'affiche pas de commentaires
        setComments([]);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadRatingsAndComments();
    
    // Setup realtime subscription for task_ratings
    if (user) {
      subscriptionRef.current = supabase
        .channel('task-ratings-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_ratings'
          },
          (payload) => {
            // Reload ratings when new ones are added
            loadRatingsAndComments();
          }
        )
        .subscribe();
    }
    
    // Cleanup subscription
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user, selectedProjectId]);

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

  const getRatingColor = (value: number) => {
    if (value >= 4) return "text-green-600";
    if (value >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  // Combiner et trier les notes et commentaires par date
  const combinedItems = [
    ...ratings.map(r => ({ ...r, type: 'rating' as const, date: r.created_at })),
    ...comments.map(c => ({ ...c, type: 'comment' as const, date: c.created_at }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec design Ialla - même style que Drive et Planning */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            
            {/* Select aligné à gauche comme dans Drive */}
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="space-y-4">

      {/* Liste des notes et commentaires */}
      {combinedItems.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Aucune évaluation</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore reçu d'évaluations ou de commentaires.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {combinedItems.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {item.type === 'rating' ? (
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {item.type === 'rating' ? 'Évaluation reçue' : 'Commentaire reçu'}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                  {item.project_title && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {item.project_title}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {item.type === 'rating' ? (
                  <div className="space-y-3">
                    {/* Tâche évaluée */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tâche :</span>
                      <span className="ml-2 font-medium">{item.task_title || 'Tâche'}</span>
                    </div>
                    
                    {/* Note */}
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-5 h-5",
                              item.rating >= star
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn("font-medium", getRatingColor(item.rating))}>
                        {getRatingLabel(item.rating)}
                      </span>
                    </div>
                    
                    {/* Commentaire de la note */}
                    {item.comment && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">{item.comment}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Carte commentée */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Sur la carte :</span>
                      <span className="ml-2 font-medium">{item.card_title || 'Carte'}</span>
                    </div>
                    
                    {/* Auteur */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">De :</span>
                      <span className="ml-2 font-medium">{item.author_name}</span>
                    </div>
                    
                    {/* Contenu du commentaire */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">{item.content}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}