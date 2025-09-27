/**
 * Hook useNoteActions - Actions CRUD et Utilitaires
 *
 * Hook spécialisé pour toutes les actions de manipulation des notes :
 * - Opérations CRUD (Create, Read, Update, Delete)
 * - Actions en lot (batch operations)
 * - Gestion des notebooks
 * - Import/Export
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { NotesAPI } from '../services/notesAPI';
import type {
  Note,
  Notebook,
  CreateNoteData,
  UpdateNoteData,
  CreateNotebookData,
  UpdateNotebookData,
  NoteAPIResponse,
  UseNoteActionsReturn,
  NoteExportFormat,
  NoteFilters
} from '../types';

export const useNoteActions = (): UseNoteActionsReturn => {
  const { user } = useAuth();

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // ==========================================
  // UTILITAIRES INTERNES
  // ==========================================

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<NoteAPIResponse<T>>,
    successMessage?: string
  ): Promise<T | null> => {
    if (!user?.id) {
      setError('Utilisateur non connecté');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const response = await operation();

      if (response.success && response.data) {
        if (successMessage) {
          console.log(successMessage);
        }
        setProgress(100);
        return response.data;
      } else {
        setError(response.error || 'Erreur lors de l\'opération');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress après 1s
    }
  }, [user?.id]);

  // ==========================================
  // ACTIONS NOTES
  // ==========================================

  const createNote = useCallback(async (
    noteData: CreateNoteData
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.createNote({
        ...noteData,
        candidate_id: user!.id
      }),
      'Note créée avec succès'
    );
  }, [user?.id, handleAsync]);

  const updateNote = useCallback(async (
    noteId: string,
    updates: UpdateNoteData
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.updateNote(noteId, updates),
      'Note mise à jour avec succès'
    );
  }, [handleAsync]);

  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    const result = await handleAsync(
      () => NotesAPI.deleteNote(noteId),
      'Note supprimée avec succès'
    );
    return result !== null;
  }, [handleAsync]);

  const duplicateNote = useCallback(async (
    noteId: string,
    newTitle?: string
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.duplicateNote(noteId, newTitle),
      'Note dupliquée avec succès'
    );
  }, [handleAsync]);

  // ==========================================
  // ACTIONS DE STATUT ET MÉTADONNÉES
  // ==========================================

  const togglePin = useCallback(async (noteId: string): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.togglePin(noteId),
      'Statut épinglé modifié'
    );
  }, [handleAsync]);

  const toggleFavorite = useCallback(async (noteId: string): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.toggleFavorite(noteId),
      'Statut favori modifié'
    );
  }, [handleAsync]);

  const updateTags = useCallback(async (
    noteId: string,
    tags: string[]
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.updateTags(noteId, tags),
      'Tags mis à jour'
    );
  }, [handleAsync]);

  const changeStatus = useCallback(async (
    noteId: string,
    status: 'draft' | 'published' | 'archived'
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.updateNote(noteId, { status }),
      `Note ${status === 'draft' ? 'mise en brouillon' : status === 'published' ? 'publiée' : 'archivée'}`
    );
  }, [handleAsync]);

  // ==========================================
  // ACTIONS NOTEBOOKS
  // ==========================================

  const createNotebook = useCallback(async (
    notebookData: CreateNotebookData
  ): Promise<Notebook | null> => {
    return handleAsync(
      () => NotesAPI.createNotebook({
        ...notebookData,
        candidate_id: user!.id
      }),
      'Carnet créé avec succès'
    );
  }, [user?.id, handleAsync]);

  const updateNotebook = useCallback(async (
    notebookId: string,
    updates: UpdateNotebookData
  ): Promise<Notebook | null> => {
    return handleAsync(
      () => NotesAPI.updateNotebook(notebookId, updates),
      'Carnet mis à jour avec succès'
    );
  }, [handleAsync]);

  const deleteNotebook = useCallback(async (
    notebookId: string,
    moveNotesToNotebook?: string
  ): Promise<boolean> => {
    const result = await handleAsync(
      () => NotesAPI.deleteNotebook(notebookId, moveNotesToNotebook),
      'Carnet supprimé avec succès'
    );
    return result !== null;
  }, [handleAsync]);

  const moveNoteToNotebook = useCallback(async (
    noteId: string,
    notebookId: string | null
  ): Promise<Note | null> => {
    return handleAsync(
      () => NotesAPI.updateNote(noteId, { notebook_id: notebookId }),
      'Note déplacée vers le carnet'
    );
  }, [handleAsync]);

  // ==========================================
  // ACTIONS EN LOT
  // ==========================================

  const bulkDelete = useCallback(async (noteIds: string[]): Promise<boolean> => {
    if (noteIds.length === 0) return false;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const total = noteIds.length;
      let completed = 0;
      let failed = 0;

      for (const noteId of noteIds) {
        try {
          await NotesAPI.deleteNote(noteId);
          completed++;
        } catch (err) {
          failed++;
          console.warn(`Erreur lors de la suppression de la note ${noteId}:`, err);
        }
        setProgress((completed + failed) / total * 100);
      }

      if (failed > 0) {
        setError(`${failed} note(s) n'ont pas pu être supprimées`);
      }

      return completed > 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression en lot');
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, []);

  const bulkUpdateTags = useCallback(async (
    noteIds: string[],
    tags: string[]
  ): Promise<number> => {
    if (noteIds.length === 0) return 0;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const total = noteIds.length;
      let completed = 0;

      for (const noteId of noteIds) {
        try {
          await NotesAPI.updateTags(noteId, tags);
          completed++;
        } catch (err) {
          console.warn(`Erreur lors de la mise à jour des tags pour ${noteId}:`, err);
        }
        setProgress(completed / total * 100);
      }

      return completed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour en lot');
      return 0;
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, []);

  const bulkChangeStatus = useCallback(async (
    noteIds: string[],
    status: 'draft' | 'published' | 'archived'
  ): Promise<number> => {
    if (noteIds.length === 0) return 0;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const total = noteIds.length;
      let completed = 0;

      for (const noteId of noteIds) {
        try {
          await NotesAPI.updateNote(noteId, { status });
          completed++;
        } catch (err) {
          console.warn(`Erreur lors de la mise à jour du statut pour ${noteId}:`, err);
        }
        setProgress(completed / total * 100);
      }

      return completed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour en lot');
      return 0;
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, []);

  // ==========================================
  // IMPORT/EXPORT
  // ==========================================

  const exportNotes = useCallback(async (
    format: NoteExportFormat,
    filters?: Partial<NoteFilters>
  ): Promise<string | null> => {
    if (!user?.id) return null;

    return handleAsync(
      () => NotesAPI.exportNotes(user.id, format, filters),
      `Export ${format.toUpperCase()} généré avec succès`
    );
  }, [user?.id, handleAsync]);

  const exportNotebook = useCallback(async (
    notebookId: string,
    format: NoteExportFormat
  ): Promise<string | null> => {
    return handleAsync(
      () => NotesAPI.exportNotebook(notebookId, format),
      `Export ${format.toUpperCase()} du carnet généré avec succès`
    );
  }, [handleAsync]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
  }, []);

  // Calcul automatique des métadonnées de note
  const calculateNoteMetrics = useCallback((content: string) => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const characterCount = content.length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // ~200 mots/minute

    return {
      word_count: wordCount,
      character_count: characterCount,
      read_time_minutes: readTimeMinutes
    };
  }, []);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // États
    loading,
    error,
    progress,

    // Actions de base
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,

    // Actions de métadonnées
    togglePin,
    toggleFavorite,
    updateTags,
    changeStatus,

    // Actions notebooks
    createNotebook,
    updateNotebook,
    deleteNotebook,
    moveNoteToNotebook,

    // Actions en lot
    bulkDelete,
    bulkUpdateTags,
    bulkChangeStatus,

    // Import/Export
    exportNotes,
    exportNotebook,

    // Utilitaires
    clearError,
    resetProgress,
    calculateNoteMetrics
  };
};