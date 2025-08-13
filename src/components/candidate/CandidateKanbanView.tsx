import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCandidateProjects } from "@/hooks/useCandidateProjects";
import { useNavigate } from "react-router-dom";
import { Trello } from "lucide-react";

export default function CandidateKanbanView() {
  const { projects, candidateId } = useCandidateProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const navigate = useNavigate();

  const handleOpenKanban = () => {
    if (selectedProjectId) {
      navigate(`/kanban?projectId=${selectedProjectId}`);
    }
  };

  if (!candidateId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Kanban</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun profil candidat trouvé. Veuillez contacter un administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Kanban</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun projet assigné. Vos tableaux Kanban apparaîtront ici une fois que vous serez assigné à des projets.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trello className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Kanban</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un projet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Projet</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un projet pour accéder à son Kanban" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectId && (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">
                  {projects.find(p => p.id === selectedProjectId)?.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {projects.find(p => p.id === selectedProjectId)?.description || "Accédez au tableau Kanban de ce projet pour gérer les tâches et suivre l'avancement."}
                </p>
              </div>
              
              <Button onClick={handleOpenKanban} className="w-full">
                <Trello className="w-4 h-4 mr-2" />
                Ouvrir le Kanban
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}