import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2, Eye } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, currentStatus: 'play' | 'pause') => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export const ProjectCard = ({ project, onStatusToggle, onDelete, onView }: ProjectCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{project.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatDate(project.project_date)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {project.description || 'Aucune description'}
          </p>
          <p className="font-medium">
            {project.price_per_minute.toFixed(2)} €/min
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={project.status === 'play' ? 'default' : 'secondary'}
              onClick={() => onStatusToggle(project.id, project.status)}
              className={project.status === 'play' ? 'bg-success hover:bg-success/80' : ''}
            >
              {project.status === 'play' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(project.id)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(project.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};