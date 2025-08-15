import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useKanbanSupabase } from "@/hooks/useKanbanSupabase";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function CandidateKanbanView() {
  const { projects, loading, candidateId } = useCandidateProjectsOptimized();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { 
    board, 
    isLoading: boardLoading,
    handleDragEnd,
    addCard,
    updateCard,
    deleteCard
  } = useKanbanSupabase(boardId || undefined);

  // Load board when project is selected
  useEffect(() => {
    const loadBoard = async () => {
      if (!selectedProjectId) return;
      
      try {
        const { data: existingBoard, error } = await supabase
          .from('kanban_boards')
          .select('id')
          .eq('project_id', selectedProjectId)
          .maybeSingle();

        if (error) {
          console.error('Erreur chargement board:', error);
          return;
        }

        if (existingBoard) {
          setBoardId(existingBoard.id);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    loadBoard();
  }, [selectedProjectId]);

  // Set default project if only one available
  useEffect(() => {
    if (projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  if (!candidateId) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Profil non trouvé</h3>
        <p className="text-muted-foreground">
          Impossible de charger votre profil candidat.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement des projets...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Aucun projet assigné</h3>
        <p className="text-muted-foreground">
          Vous n'avez aucun projet assigné pour le moment.
        </p>
      </Card>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h2 className="text-2xl font-bold">Kanban - Sélectionner un projet</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Choisir un projet</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un projet..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!boardId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">Aucun tableau Kanban trouvé</div>
          <p className="text-sm text-muted-foreground">
            Le tableau sera créé automatiquement lors du démarrage du projet.
          </p>
        </div>
      </div>
    );
  }

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement du tableau...</div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Kanban</h2>
            <p className="text-muted-foreground">{selectedProject?.title}</p>
          </div>
        </div>

        {projects.length > 1 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kanban Board */}
      {board ? (
        <div className="h-[calc(100vh-200px)]">
          <KanbanBoard
            board={board}
            onDragEnd={handleDragEnd}
            onAddColumn={() => {}} // Disable column creation for candidates
            onAddCard={(columnId) => {
              // Simplified card creation for candidates
              const newCard = {
                title: 'Nouvelle tâche',
                description: '',
                columnId,
                priority: 'medium' as const,
                status: 'todo' as const
              };
              addCard(newCard);
            }}
            onEditColumn={() => {}} // Disable column editing for candidates
            onDeleteColumn={() => {}} // Disable column deletion for candidates
            onCardClick={() => {}} // Handle card click
            onCardEdit={updateCard}
            onCardDelete={deleteCard}
            projectFilter=""
            onProjectFilterChange={() => {}}
            availableProjects={[]}
          />
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Tableau non disponible</h3>
          <p className="text-muted-foreground">
            Le tableau Kanban n'est pas encore configuré pour ce projet.
          </p>
        </Card>
      )}
    </div>
  );
}