import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import { EnhancedMessageSystem } from "@/components/shared/EnhancedMessageSystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function CandidateMessagesView() {
  const { projects, loading, candidateId } = useCandidateProjectsOptimized();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();

  // Auto-select first project if only one
  if (projects.length === 1 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  if (loading || !candidateId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>Aucun projet assigné</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            Vous n'avez pas encore de projets assignés. Les discussions apparaîtront ici une fois que vous serez assigné à un projet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with project selector */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-64 bg-white/90 backdrop-blur-sm border-white/20">
                  <SelectValue placeholder="Sélectionner un projet" />
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
          </div>
        </div>
      </div>

      {selectedProjectId ? (
        <div className="h-[calc(100vh-12rem)]">
          <EnhancedMessageSystem projectId={selectedProjectId} userType="candidate" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sélectionnez un projet</h3>
            <p className="text-muted-foreground">
              Choisissez un projet dans la liste ci-dessus pour accéder aux discussions d'équipe.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}