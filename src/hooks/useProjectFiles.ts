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
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading project files:', error);
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
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        throw new Error('Impossible de générer le lien de téléchargement');
      }
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
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