import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useKanbanCardFiles = (cardId: string) => {
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadFileCount = useCallback(async () => {
    // Don't load files if cardId is empty or invalid
    if (!cardId || cardId.trim() === '') {
      setFileCount(0);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .list(cardId, {
          limit: 1000,
          offset: 0
        });

      if (error) {
        // If folder doesn't exist, count is 0
        if (error.message?.includes('not found')) {
          setFileCount(0);
        } else {
          throw error;
        }
        return;
      }

      // Filter out corrupted/empty files and count valid ones
      const validFiles = (data || []).filter(file => 
        file.metadata?.size && file.metadata.size > 0 && file.name
      );

      setFileCount(validFiles.length);
    } catch (error) {
      console.error('Error loading file count:', error);
      setFileCount(0);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  // Load file count when cardId changes
  useEffect(() => {
    if (cardId) {
      loadFileCount();
    } else {
      setFileCount(0);
    }
  }, [cardId, loadFileCount]);

  return {
    fileCount,
    loading,
    reloadFileCount: loadFileCount
  };
};