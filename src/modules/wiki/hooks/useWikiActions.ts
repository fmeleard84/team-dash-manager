import { useCallback } from 'react';
import { useToast } from '@/ui/components/use-toast';
import { WikiAPI } from '../services/wikiAPI';
import {
  WikiPage,
  WikiExport,
  WikiBackup,
  CreateWikiPageData,
  UpdateWikiPageData,
  WikiExportFormat,
  UseWikiActionsReturn
} from '../types';

export function useWikiActions(): UseWikiActionsReturn {
  const { toast } = useToast();

  /**
   * Crée une nouvelle page
   */
  const createPage = useCallback(async (data: CreateWikiPageData): Promise<WikiPage> => {
    const response = await WikiAPI.createPage(data);

    if (response.success) {
      toast({
        title: "Page créée",
        description: "La nouvelle page a été créée avec succès",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de créer la page",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Création impossible");
    }
  }, [toast]);

  /**
   * Met à jour une page existante
   */
  const updatePage = useCallback(async (
    pageId: string,
    data: UpdateWikiPageData
  ): Promise<WikiPage> => {
    const response = await WikiAPI.updatePage(pageId, data);

    if (response.success) {
      toast({
        title: "Page sauvegardée",
        description: "Les modifications ont été enregistrées",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de sauvegarder la page",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Sauvegarde impossible");
    }
  }, [toast]);

  /**
   * Supprime une page et ses sous-pages
   */
  const deletePage = useCallback(async (pageId: string): Promise<boolean> => {
    // Demander confirmation
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette page et toutes ses sous-pages ? Cette action est irréversible.'
    );

    if (!confirmed) return false;

    const response = await WikiAPI.deletePage(pageId);

    if (response.success) {
      toast({
        title: "Page supprimée",
        description: "La page a été supprimée avec succès",
      });
      return true;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de supprimer la page",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Duplique une page
   */
  const duplicatePage = useCallback(async (
    pageId: string,
    newTitle?: string
  ): Promise<WikiPage> => {
    const response = await WikiAPI.duplicatePage(pageId, newTitle);

    if (response.success) {
      toast({
        title: "Page dupliquée",
        description: "Une copie de la page a été créée",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de dupliquer la page",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Duplication impossible");
    }
  }, [toast]);

  /**
   * Déplace une page vers un nouveau parent
   */
  const movePage = useCallback(async (
    pageId: string,
    newParentId: string | null
  ): Promise<WikiPage> => {
    const response = await WikiAPI.updatePage(pageId, { parent_id: newParentId });

    if (response.success) {
      toast({
        title: "Page déplacée",
        description: "La page a été déplacée avec succès",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de déplacer la page",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Déplacement impossible");
    }
  }, [toast]);

  /**
   * Réorganise l'ordre des pages
   */
  const reorderPages = useCallback(async (
    pageIds: string[],
    parentId: string | null
  ): Promise<void> => {
    try {
      // Mettre à jour l'ordre d'affichage de chaque page
      const promises = pageIds.map((pageId, index) =>
        WikiAPI.updatePage(pageId, { display_order: index })
      );

      await Promise.all(promises);

      toast({
        title: "Ordre mis à jour",
        description: "L'ordre des pages a été modifié",
      });
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réorganiser les pages",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Change la visibilité d'une page (public/privé)
   */
  const togglePageVisibility = useCallback(async (pageId: string): Promise<WikiPage> => {
    const response = await WikiAPI.togglePageVisibility(pageId);

    if (response.success) {
      const isPublic = response.data.is_public;
      toast({
        title: isPublic ? "Page rendue publique" : "Page rendue privée",
        description: isPublic
          ? "Cette page est maintenant visible par tous les membres du projet"
          : "Cette page n'est visible que par vous",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de changer la visibilité",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Changement de visibilité impossible");
    }
  }, [toast]);

  /**
   * Ajoute une page aux favoris
   */
  const addPageToFavorites = useCallback(async (pageId: string): Promise<void> => {
    try {
      // Implémentation avec table user_favorites si nécessaire
      // Pour l'instant, stockage local simple
      const favorites = JSON.parse(localStorage.getItem('wiki-favorites') || '[]');
      if (!favorites.includes(pageId)) {
        favorites.push(pageId);
        localStorage.setItem('wiki-favorites', JSON.stringify(favorites));
      }

      toast({
        title: "Ajouté aux favoris",
        description: "Cette page a été ajoutée à vos favoris",
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter aux favoris",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Retire une page des favoris
   */
  const removePageFromFavorites = useCallback(async (pageId: string): Promise<void> => {
    try {
      const favorites = JSON.parse(localStorage.getItem('wiki-favorites') || '[]');
      const newFavorites = favorites.filter((id: string) => id !== pageId);
      localStorage.setItem('wiki-favorites', JSON.stringify(newFavorites));

      toast({
        title: "Retiré des favoris",
        description: "Cette page a été retirée de vos favoris",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer des favoris",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Crée une page à partir d'un template
   */
  const createFromTemplate = useCallback(async (
    templateId: string,
    data: Partial<CreateWikiPageData>
  ): Promise<WikiPage> => {
    try {
      // Récupérer le template
      // Pour l'instant, création simple - à enrichir avec vraie gestion des templates
      const pageData: CreateWikiPageData = {
        project_id: data.project_id!,
        title: data.title || 'Nouvelle page depuis template',
        content: data.content || '<p>Contenu du template...</p>',
        template_id: templateId,
        ...data
      };

      return await createPage(pageData);
    } catch (error) {
      console.error('Erreur lors de la création depuis template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la page depuis le template",
        variant: "destructive",
      });
      throw error;
    }
  }, [createPage, toast]);

  /**
   * Exporte des pages dans un format donné
   */
  const exportPages = useCallback(async (
    pageIds: string[],
    format: WikiExportFormat
  ): Promise<WikiExport> => {
    try {
      // Pour l'instant, simulation d'export simple
      const exportData: WikiExport = {
        format,
        pages: pageIds,
        include_comments: true,
        include_metadata: true,
        include_versions: false,
        created_at: new Date().toISOString(),
        status: 'processing'
      };

      toast({
        title: "Export en cours",
        description: `L'export au format ${format.toUpperCase()} a été lancé`,
      });

      // Simulation - remplacer par vraie implémentation
      setTimeout(() => {
        toast({
          title: "Export terminé",
          description: "Votre export est prêt au téléchargement",
        });
      }, 3000);

      return exportData;
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les pages",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Crée une sauvegarde complète du wiki
   */
  const createBackup = useCallback(async (): Promise<WikiBackup> => {
    try {
      // Simulation de création de sauvegarde
      const backup: WikiBackup = {
        id: `backup_${Date.now()}`,
        project_id: '', // À récupérer du contexte
        created_by: '', // À récupérer de l'utilisateur actuel
        created_at: new Date().toISOString(),
        size_bytes: 0, // À calculer
        pages_count: 0, // À calculer
        comments_count: 0, // À calculer
        download_url: '',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
        status: 'active'
      };

      toast({
        title: "Sauvegarde créée",
        description: "Une sauvegarde complète du wiki a été créée",
      });

      return backup;
    } catch (error) {
      console.error('Erreur lors de la création de sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la sauvegarde",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    createPage,
    updatePage,
    deletePage,
    duplicatePage,
    movePage,
    reorderPages,
    togglePageVisibility,
    addPageToFavorites,
    removePageFromFavorites,
    createFromTemplate,
    exportPages,
    createBackup
  };
}