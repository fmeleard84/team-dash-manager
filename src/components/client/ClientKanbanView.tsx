import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useKanbanSupabase } from "@/hooks/useKanbanSupabase";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Project {
  id: string;
  title: string;
  status: string;
}

export default function ClientKanbanView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { 
    board, 
    isLoading: boardLoading,
    handleDragEnd,
    addCard,
    addColumn,
    updateCard,
    updateColumn,
    deleteCard,
    deleteColumn
  } = useKanbanSupabase(boardId || undefined);

  // Load client projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('status', 'play') // Only active projects have Kanban
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
        
        // Set default project if only one
        if (data && data.length === 1) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Erreur chargement projets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

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
        <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
        <p className="text-muted-foreground">
          Vous n'avez aucun projet en cours avec un tableau Kanban.
        </p>
        <Button 
          className="mt-4" 
          onClick={() => navigate('/client-dashboard')}
        >
          Retour aux projets
        </Button>
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
            <h2 className="text-2xl font-bold">Gestion Kanban</h2>
            <p className="text-muted-foreground">{selectedProject?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          
          <Button onClick={() => addColumn({ title: 'Nouvelle colonne', position: board?.columns.length || 0 })}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter colonne
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {board ? (
        <div className="h-[calc(100vh-200px)]">
          <KanbanBoard
            board={board}
            onDragEnd={handleDragEnd}
            onAddColumn={() => addColumn({ title: 'Nouvelle colonne', position: board.columns.length })}
            onAddCard={(columnId) => {
              const newCard = {
                title: 'Nouvelle tâche',
                description: '',
                columnId,
                priority: 'medium' as const,
                status: 'todo' as const
              };
              addCard(newCard);
            }}
            onEditColumn={updateColumn}
            onDeleteColumn={deleteColumn}
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