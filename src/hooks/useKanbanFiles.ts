import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KanbanFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export const useKanbanFiles = (cardId: string) => {
  const [files, setFiles] = useState<KanbanFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load files for a card
  const loadFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .list(cardId, {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from('kanban-files')
            .createSignedUrl(`${cardId}/${file.name}`, 3600); // 1 hour expiry

          return {
            id: file.id,
            name: file.name,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || 'application/octet-stream',
            url: urlData?.signedUrl || '',
            uploadedAt: file.created_at || new Date().toISOString()
          };
        })
      );

      setFiles(filesWithUrls);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Erreur lors du chargement des fichiers');
    }
  }, [cardId]);

  // Upload a file
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${cardId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kanban-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await loadFiles(); // Reload files to update the list
      toast.success(`Fichier "${file.name}" téléchargé`);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors du téléchargement du fichier');
    } finally {
      setUploading(false);
    }
  }, [cardId, loadFiles]);

  // Delete a file
  const deleteFile = useCallback(async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('kanban-files')
        .remove([`${cardId}/${fileName}`]);

      if (error) throw error;

      await loadFiles(); // Reload files to update the list
      toast.success('Fichier supprimé');

    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erreur lors de la suppression du fichier');
    }
  }, [cardId, loadFiles]);

  // Download a file
  const downloadFile = useCallback(async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .download(`${cardId}/${fileName}`);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement du fichier');
    }
  }, [cardId]);

  // Get signed URL for a file
  const getFileUrl = useCallback(async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .createSignedUrl(`${cardId}/${fileName}`, 3600);

      if (error) throw error;
      return data?.signedUrl || '';
    } catch (error) {
      console.error('Error getting file URL:', error);
      return '';
    }
  }, [cardId]);

  return {
    files,
    uploading,
    loadFiles,
    uploadFile,
    deleteFile,
    downloadFile,
    getFileUrl
  };
};