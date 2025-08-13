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
    // Don't load files if cardId is empty or invalid
    if (!cardId || cardId.trim() === '') {
      setFiles([]);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .list(cardId, {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      // Filter out corrupted/empty files and process valid ones
      const validFiles = (data || []).filter(file => 
        file.metadata?.size && file.metadata.size > 0 && file.name
      );

      const filesWithUrls = await Promise.allSettled(
        validFiles.map(async (file) => {
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from('kanban-files')
              .createSignedUrl(`${cardId}/${file.name}`, 3600);

            // Skip files that can't generate signed URLs
            if (urlError || !urlData?.signedUrl) {
              console.warn(`Failed to create signed URL for file ${file.name}:`, urlError);
              return null;
            }

            return {
              id: file.id,
              name: file.name,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || 'application/octet-stream',
              url: urlData.signedUrl,
              uploadedAt: file.created_at || new Date().toISOString()
            };
          } catch (error) {
            console.warn(`Error processing file ${file.name}:`, error);
            return null;
          }
        })
      );

      // Filter out failed promises and null results
      const successfulFiles = filesWithUrls
        .filter((result): result is PromiseFulfilledResult<KanbanFile | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as KanbanFile);

      setFiles(successfulFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]); // Clear files on error
      // Only show toast if it's not a simple "folder not found" error
      if (!error?.message?.includes('not found')) {
        toast.error('Erreur lors du chargement des fichiers');
      }
    }
  }, [cardId]);

  // Upload a file
  const uploadFile = useCallback(async (file: File) => {
    if (!cardId || cardId.trim() === '') {
      toast.error('ID de carte invalide');
      return;
    }

    if (!file || file.size === 0) {
      toast.error('Fichier invalide');
      return;
    }

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
    if (!cardId || !fileName) {
      toast.error('Paramètres invalides pour la suppression');
      return;
    }

    try {
      // Remove only the specific file, not the entire folder
      const filePath = `${cardId}/${fileName}`;
      const { error } = await supabase.storage
        .from('kanban-files')
        .remove([filePath]);

      if (error) throw error;

      // Update local state immediately for better UX
      setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
      
      // Then reload to ensure consistency
      await loadFiles();
      toast.success('Fichier supprimé');

    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erreur lors de la suppression du fichier');
      // Reload files to ensure state consistency
      await loadFiles();
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