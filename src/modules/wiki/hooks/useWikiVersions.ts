import { useState, useCallback } from 'react';
import { useToast } from '@/ui/components/use-toast';
import { WikiAPI } from '../services/wikiAPI';
import {
  WikiVersion,
  WikiDiff,
  WikiPage,
  WikiError,
  UseWikiVersionsReturn
} from '../types';

export function useWikiVersions(): UseWikiVersionsReturn {
  const { toast } = useToast();

  // États
  const [versions, setVersions] = useState<WikiVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WikiError | null>(null);

  /**
   * Charge les versions d'une page
   */
  const loadVersions = useCallback(async (pageId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Simuler le chargement des versions - à remplacer par vraie implémentation
      // Pour l'instant, création de données de test
      const mockVersions: WikiVersion[] = [
        {
          id: `v_${Date.now()}_1`,
          page_id: pageId,
          version: 3,
          title: 'Page actuelle',
          content: '<p>Contenu actuel de la page...</p>',
          changed_by: 'current_user',
          changed_at: new Date().toISOString(),
          change_summary: 'Mise à jour du contenu',
          is_major: true
        },
        {
          id: `v_${Date.now()}_2`,
          page_id: pageId,
          version: 2,
          title: 'Version précédente',
          content: '<p>Ancien contenu de la page...</p>',
          changed_by: 'other_user',
          changed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          change_summary: 'Correction des erreurs',
          is_major: false
        },
        {
          id: `v_${Date.now()}_3`,
          page_id: pageId,
          version: 1,
          title: 'Version initiale',
          content: '<p>Premier contenu...</p>',
          changed_by: 'creator_user',
          changed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          change_summary: 'Création initiale',
          is_major: true
        }
      ];

      setVersions(mockVersions);
    } catch (err) {
      console.error('useWikiVersions.loadVersions:', err);
      setError({
        code: 'LOAD_VERSIONS_ERROR',
        message: 'Impossible de charger les versions'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Compare deux versions et retourne les différences
   */
  const compareVersions = useCallback(async (
    versionId1: string,
    versionId2: string
  ): Promise<WikiDiff> => {
    try {
      const version1 = versions.find(v => v.id === versionId1);
      const version2 = versions.find(v => v.id === versionId2);

      if (!version1 || !version2) {
        throw new Error('Versions non trouvées');
      }

      // Simulation d'un diff simple - à remplacer par une vraie implémentation
      const mockDiff: WikiDiff = {
        additions: [
          {
            line_number: 5,
            content: '<p>Nouveau paragraphe ajouté</p>',
            type: 'add'
          }
        ],
        deletions: [
          {
            line_number: 3,
            content: '<p>Ancien paragraphe supprimé</p>',
            type: 'remove'
          }
        ],
        modifications: [
          {
            line_number: 1,
            content: '<h1>Titre modifié</h1>',
            type: 'modify'
          }
        ],
        stats: {
          additions_count: 1,
          deletions_count: 1,
          modifications_count: 1
        }
      };

      toast({
        title: "Comparaison terminée",
        description: `${mockDiff.stats.additions_count + mockDiff.stats.deletions_count + mockDiff.stats.modifications_count} différences trouvées`,
      });

      return mockDiff;
    } catch (error) {
      console.error('useWikiVersions.compareVersions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de comparer les versions",
        variant: "destructive",
      });
      throw error;
    }
  }, [versions, toast]);

  /**
   * Restaure une version spécifique
   */
  const restoreVersion = useCallback(async (
    pageId: string,
    versionId: string
  ): Promise<WikiPage> => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) {
        throw new Error('Version non trouvée');
      }

      // Confirmer la restauration
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir restaurer cette version ?\n` +
        `Version: ${version.version}\n` +
        `Date: ${new Date(version.changed_at).toLocaleDateString()}\n` +
        `Résumé: ${version.change_summary || 'Aucun résumé'}`
      );

      if (!confirmed) {
        throw new Error('Restauration annulée');
      }

      // Utiliser l'API Wiki pour mettre à jour la page avec le contenu de la version
      const response = await WikiAPI.updatePage(pageId, {
        title: version.title,
        content: version.content,
        change_summary: `Restauration de la version ${version.version}`,
        is_major_change: true
      });

      if (response.success) {
        toast({
          title: "Version restaurée",
          description: `La version ${version.version} a été restaurée avec succès`,
        });

        // Créer une nouvelle version pour marquer la restauration
        await createVersion(pageId, `Restauration de la version ${version.version}`, true);

        return response.data;
      } else {
        throw new Error(response.error?.message || 'Erreur lors de la restauration');
      }
    } catch (error) {
      console.error('useWikiVersions.restoreVersion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de restaurer la version';

      if (errorMessage !== 'Restauration annulée') {
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      }

      throw error;
    }
  }, [versions, toast]);

  /**
   * Crée une nouvelle version (snapshot) d'une page
   */
  const createVersion = useCallback(async (
    pageId: string,
    summary?: string,
    isMajor: boolean = false
  ): Promise<WikiVersion> => {
    try {
      const response = await WikiAPI.createVersion(pageId, summary, isMajor);

      if (response.success) {
        // Ajouter la nouvelle version à la liste
        setVersions(prev => [response.data, ...prev]);

        toast({
          title: "Version créée",
          description: summary || "Une nouvelle version a été créée",
        });

        return response.data;
      } else {
        throw new Error(response.error?.message || 'Erreur lors de la création de version');
      }
    } catch (error) {
      console.error('useWikiVersions.createVersion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la version",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Supprime une version (attention: action irréversible)
   */
  const deleteVersion = useCallback(async (versionId: string): Promise<void> => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) {
        throw new Error('Version non trouvée');
      }

      // Demander confirmation
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer cette version ?\n` +
        `Version: ${version.version}\n` +
        `Date: ${new Date(version.changed_at).toLocaleDateString()}\n` +
        `Cette action est irréversible.`
      );

      if (!confirmed) return;

      // Simuler la suppression - à remplacer par vraie implémentation
      setVersions(prev => prev.filter(v => v.id !== versionId));

      toast({
        title: "Version supprimée",
        description: `La version ${version.version} a été supprimée`,
      });
    } catch (error) {
      console.error('useWikiVersions.deleteVersion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la version",
        variant: "destructive",
      });
    }
  }, [versions, toast]);

  /**
   * Exporte une version spécifique
   */
  const exportVersion = useCallback(async (
    versionId: string,
    format: 'html' | 'markdown' | 'pdf' = 'html'
  ): Promise<void> => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) {
        throw new Error('Version non trouvée');
      }

      // Simuler l'export
      const blob = new Blob([version.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${version.title}_v${version.version}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `La version ${version.version} a été exportée`,
      });
    } catch (error) {
      console.error('useWikiVersions.exportVersion:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter la version",
        variant: "destructive",
      });
    }
  }, [versions, toast]);

  return {
    versions,
    loading,
    error,
    loadVersions,
    compareVersions,
    restoreVersion,
    createVersion,
    deleteVersion,
    exportVersion
  };
}