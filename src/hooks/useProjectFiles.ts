import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  uploaded_at: string;
}

export const useProjectFiles = (projectId: string | null) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    if (!projectId) {
      setFiles([]);
      return;
    }

    try {
      setLoading(true);
      
      // First try to get files from storage bucket (where they actually are)
      const projectPath = `project/${projectId}`;
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('project-files')
        .list(projectPath, {
          limit: 100,
          offset: 0
        });
      
      if (!storageError && storageFiles && storageFiles.length > 0) {
        // Convert storage files to ProjectFile format
        const projectFiles: ProjectFile[] = storageFiles.map(file => ({
          id: file.id || `${projectId}-${file.name}`,
          file_name: file.name,
          file_path: `${projectPath}/${file.name}`,
          file_size: file.metadata?.size || 0,
          file_type: file.metadata?.mimetype || 'application/octet-stream',
          uploaded_at: file.created_at || new Date().toISOString()
        }));
        
        setFiles(projectFiles);
        console.log('Loaded files from storage:', projectFiles);
        return;
      }
      
      // Fallback to database table (legacy support)
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading project files from database:', error);
        return;
      }

      setFiles(data || []);
    } catch (error) {
      console.error('Error in loadFiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (file: ProjectFile) => {
    try {
      // Use download method directly for better compatibility
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path);
      
      if (error) {
        // Fallback to signed URL if download fails
        const { data: signedData, error: signedError } = await supabase.storage
          .from('project-files')
          .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry
        
        if (signedError) {
          console.error('Error creating signed URL:', signedError);
          throw new Error('Impossible de générer le lien de téléchargement');
        }
        
        if (signedData?.signedUrl) {
          window.open(signedData.signedUrl, '_blank');
        }
      } else if (data) {
        // Create download link from blob
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  return {
    files,
    loading,
    loadFiles,
    downloadFile
  };
};