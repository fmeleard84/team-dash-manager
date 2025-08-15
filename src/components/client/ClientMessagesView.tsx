import { useEffect, useState } from "react";
import DynamicMessageSystem from "@/components/messages/DynamicMessageSystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Project {
  id: string;
  title: string;
  status: string;
}

export default function ClientMessagesView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('owner_id', user.id)
          .eq('status', 'play')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur chargement projets:', error);
          return;
        }

        setProjects(data || []);
        
        // Auto-select first project if only one
        if (data && data.length === 1) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id]);

  if (loading) {
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
          <CardTitle>Aucun projet actif</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            Vous n'avez pas de projets en cours. Les discussions d'équipe apparaîtront ici une fois que vos projets seront démarrés.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Messages de projet</h1>
        </div>
        
        {projects.length > 1 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-80">
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
        )}
      </div>

      {selectedProjectId ? (
        <DynamicMessageSystem projectId={selectedProjectId} />
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