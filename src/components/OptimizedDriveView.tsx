import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

interface OptimizedDriveViewProps {
  projectId?: string;
}

export default function OptimizedDriveView({ projectId }: OptimizedDriveViewProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { candidateProfile, clientProfile, isCandidate, isClient } = useUserProfile();
  
  // Only allow access if user has a valid profile
  const canAccessFiles = (isCandidate && candidateProfile) || (isClient && clientProfile);

  useEffect(() => {
    const loadFiles = async () => {
      if (!projectId || !canAccessFiles) {
        setFiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: storageError } = await supabase.storage
          .from('project-files')
          .list(projectId, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'updated_at', order: 'desc' }
          });

        if (storageError) {
          console.error('Storage error:', storageError);
          setError('Erreur lors du chargement des fichiers');
          toast.error('Impossible de charger les fichiers');
          return;
        }

        setFiles(data || []);
      } catch (err) {
        console.error('Drive error:', err);
        setError('Erreur de connexion');
        toast.error('Erreur de connexion au stockage');
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [projectId, canAccessFiles]);

  if (!canAccessFiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <p>Accès non autorisé. Veuillez vous connecter avec un compte valide.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Chargement des fichiers...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-2"
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Drive du projet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Aucun fichier dans ce projet
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file.metadata?.size 
                      ? `${Math.round(file.metadata.size / 1024)} KB` 
                      : 'Taille inconnue'
                    }
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Télécharger
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}