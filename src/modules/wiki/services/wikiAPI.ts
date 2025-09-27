import { supabase } from '@/integrations/supabase/client';
import {
  WikiPage,
  WikiComment,
  WikiTemplate,
  WikiVersion,
  WikiStats,
  WikiSettings,
  WikiSearch,
  WikiSearchResult,
  WikiExport,
  WikiBackup,
  CreateWikiPageData,
  UpdateWikiPageData,
  CreateWikiCommentData,
  WikiFilters,
  WikiSearchFilters,
  WikiExportFormat,
  WikiAPIResponse,
  WikiPaginatedResponse,
  WikiError,
  WikiNavigation,
  WikiAuthor,
  WikiActivity
} from '../types';

export class WikiAPI {
  // ====== GESTION DES PAGES ======

  /**
   * Récupère toutes les pages d'un projet avec navigation enrichie
   */
  static async getPages(
    projectId: string,
    filters?: WikiFilters
  ): Promise<WikiAPIResponse<WikiPage[]>> {
    try {
      let query = supabase
        .from('wiki_pages')
        .select(`
          *,
          profiles!wiki_pages_author_id_fkey(first_name, last_name, email),
          last_editor:profiles!wiki_pages_last_edited_by_fkey(first_name, last_name)
        `)
        .eq('project_id', projectId);

      // Appliquer les filtres
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      if (filters?.authors?.length) {
        query = query.in('author_id', filters.authors);
      }

      if (filters?.visibility?.length) {
        if (filters.visibility.includes('public') && !filters.visibility.includes('private')) {
          query = query.eq('is_public', true);
        } else if (filters.visibility.includes('private') && !filters.visibility.includes('public')) {
          query = query.eq('is_public', false);
        }
      }

      if (filters?.tags?.length) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      if (filters?.has_comments !== undefined) {
        // Sous-requête pour les pages avec commentaires
        query = filters.has_comments
          ? query.not('id', 'in', '(SELECT DISTINCT page_id FROM wiki_comments)')
          : query.in('id', '(SELECT DISTINCT page_id FROM wiki_comments)');
      }

      if (filters?.is_template !== undefined) {
        query = query.eq('is_template', filters.is_template);
      }

      // Tri
      const sortBy = filters?.sort_by || 'updated_at';
      const sortOrder = filters?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      // Enrichir les données
      const enrichedPages: WikiPage[] = (data || []).map(page => ({
        ...page,
        author_name: page.profiles
          ? `${page.profiles.first_name || ''} ${page.profiles.last_name || ''}`.trim()
          : 'Utilisateur',
        last_editor_name: page.last_editor
          ? `${page.last_editor.first_name || ''} ${page.last_editor.last_name || ''}`.trim()
          : undefined,
        children: [],
        comments_count: 0 // À calculer si nécessaire
      }));

      return {
        data: enrichedPages,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.getPages:', error);
      return {
        data: [],
        success: false,
        error: {
          code: 'FETCH_PAGES_ERROR',
          message: 'Impossible de récupérer les pages du wiki'
        }
      };
    }
  }

  /**
   * Récupère une page spécifique avec détails complets
   */
  static async getPage(pageId: string): Promise<WikiAPIResponse<WikiPage>> {
    try {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select(`
          *,
          profiles!wiki_pages_author_id_fkey(first_name, last_name, email, avatar_url),
          last_editor:profiles!wiki_pages_last_edited_by_fkey(first_name, last_name),
          comments:wiki_comments(count)
        `)
        .eq('id', pageId)
        .single();

      if (error) throw error;

      const enrichedPage: WikiPage = {
        ...data,
        author_name: data.profiles
          ? `${data.profiles.first_name || ''} ${data.profiles.last_name || ''}`.trim()
          : 'Utilisateur',
        author_email: data.profiles?.email,
        last_editor_name: data.last_editor
          ? `${data.last_editor.first_name || ''} ${data.last_editor.last_name || ''}`.trim()
          : undefined,
        comments_count: data.comments?.[0]?.count || 0,
        children: []
      };

      // Incrémenter le compteur de vues
      await this.incrementViewCount(pageId);

      return {
        data: enrichedPage,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.getPage:', error);
      return {
        data: {} as WikiPage,
        success: false,
        error: {
          code: 'FETCH_PAGE_ERROR',
          message: 'Impossible de récupérer la page'
        }
      };
    }
  }

  /**
   * Crée une nouvelle page
   */
  static async createPage(pageData: CreateWikiPageData): Promise<WikiAPIResponse<WikiPage>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data, error } = await supabase
        .from('wiki_pages')
        .insert({
          project_id: pageData.project_id,
          title: pageData.title,
          content: pageData.content || `<h1>${pageData.title}</h1><p>Commencez à écrire votre contenu ici...</p>`,
          parent_id: pageData.parent_id || null,
          author_id: user.id,
          is_public: pageData.is_public !== false, // true par défaut
          tags: pageData.tags || [],
          template_id: pageData.template_id,
          metadata: pageData.metadata || {},
          version: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Récupérer la page complète avec enrichissements
      return await this.getPage(data.id);
    } catch (error) {
      console.error('WikiAPI.createPage:', error);
      return {
        data: {} as WikiPage,
        success: false,
        error: {
          code: 'CREATE_PAGE_ERROR',
          message: 'Impossible de créer la page'
        }
      };
    }
  }

  /**
   * Met à jour une page existante
   */
  static async updatePage(
    pageId: string,
    updateData: UpdateWikiPageData
  ): Promise<WikiAPIResponse<WikiPage>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer la version actuelle pour l'incrémenter
      const { data: currentPage } = await supabase
        .from('wiki_pages')
        .select('version, author_id')
        .eq('id', pageId)
        .single();

      if (!currentPage) throw new Error('Page non trouvée');

      const { data, error } = await supabase
        .from('wiki_pages')
        .update({
          ...updateData,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
          version: currentPage.version + 1
        })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;

      // Créer une version si c'est un changement majeur
      if (updateData.is_major_change) {
        await this.createVersion(pageId, updateData.change_summary);
      }

      return await this.getPage(pageId);
    } catch (error) {
      console.error('WikiAPI.updatePage:', error);
      return {
        data: {} as WikiPage,
        success: false,
        error: {
          code: 'UPDATE_PAGE_ERROR',
          message: 'Impossible de mettre à jour la page'
        }
      };
    }
  }

  /**
   * Supprime une page et ses sous-pages
   */
  static async deletePage(pageId: string): Promise<WikiAPIResponse<boolean>> {
    try {
      // Supprimer récursivement les sous-pages
      const { data: childPages } = await supabase
        .from('wiki_pages')
        .select('id')
        .eq('parent_id', pageId);

      if (childPages && childPages.length > 0) {
        for (const child of childPages) {
          await this.deletePage(child.id);
        }
      }

      // Supprimer les commentaires
      await supabase
        .from('wiki_comments')
        .delete()
        .eq('page_id', pageId);

      // Supprimer les versions
      await supabase
        .from('wiki_versions')
        .delete()
        .eq('page_id', pageId);

      // Supprimer la page
      const { error } = await supabase
        .from('wiki_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      return {
        data: true,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.deletePage:', error);
      return {
        data: false,
        success: false,
        error: {
          code: 'DELETE_PAGE_ERROR',
          message: 'Impossible de supprimer la page'
        }
      };
    }
  }

  /**
   * Duplique une page
   */
  static async duplicatePage(
    pageId: string,
    newTitle?: string
  ): Promise<WikiAPIResponse<WikiPage>> {
    try {
      const { data: originalPage } = await this.getPage(pageId);
      if (!originalPage) throw new Error('Page source non trouvée');

      const duplicateData: CreateWikiPageData = {
        project_id: originalPage.project_id,
        title: newTitle || `${originalPage.title} (Copie)`,
        content: originalPage.content,
        parent_id: originalPage.parent_id,
        is_public: originalPage.is_public,
        tags: originalPage.tags || [],
        metadata: originalPage.metadata
      };

      return await this.createPage(duplicateData);
    } catch (error) {
      console.error('WikiAPI.duplicatePage:', error);
      return {
        data: {} as WikiPage,
        success: false,
        error: {
          code: 'DUPLICATE_PAGE_ERROR',
          message: 'Impossible de dupliquer la page'
        }
      };
    }
  }

  /**
   * Change la visibilité d'une page
   */
  static async togglePageVisibility(pageId: string): Promise<WikiAPIResponse<WikiPage>> {
    try {
      const { data: currentPage } = await supabase
        .from('wiki_pages')
        .select('is_public')
        .eq('id', pageId)
        .single();

      if (!currentPage) throw new Error('Page non trouvée');

      return await this.updatePage(pageId, {
        is_public: !currentPage.is_public
      });
    } catch (error) {
      console.error('WikiAPI.togglePageVisibility:', error);
      return {
        data: {} as WikiPage,
        success: false,
        error: {
          code: 'TOGGLE_VISIBILITY_ERROR',
          message: 'Impossible de changer la visibilité'
        }
      };
    }
  }

  // ====== GESTION DES COMMENTAIRES ======

  /**
   * Récupère les commentaires d'une page
   */
  static async getComments(pageId: string): Promise<WikiAPIResponse<WikiComment[]>> {
    try {
      const { data, error } = await supabase
        .from('wiki_comments_with_authors')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organiser en arbre de commentaires
      const comments = this.buildCommentsTree(data || []);

      return {
        data: comments,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.getComments:', error);
      return {
        data: [],
        success: false,
        error: {
          code: 'FETCH_COMMENTS_ERROR',
          message: 'Impossible de récupérer les commentaires'
        }
      };
    }
  }

  /**
   * Ajoute un commentaire
   */
  static async addComment(commentData: CreateWikiCommentData): Promise<WikiAPIResponse<WikiComment>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data, error } = await supabase
        .from('wiki_comments')
        .insert({
          page_id: commentData.page_id,
          author_id: user.id,
          parent_comment_id: commentData.parent_comment_id || null,
          content: commentData.content
        })
        .select()
        .single();

      if (error) throw error;

      // Récupérer le commentaire avec l'auteur
      const { data: enrichedComment } = await supabase
        .from('wiki_comments_with_authors')
        .select('*')
        .eq('id', data.id)
        .single();

      return {
        data: enrichedComment as WikiComment,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.addComment:', error);
      return {
        data: {} as WikiComment,
        success: false,
        error: {
          code: 'ADD_COMMENT_ERROR',
          message: 'Impossible d\'ajouter le commentaire'
        }
      };
    }
  }

  /**
   * Met à jour un commentaire
   */
  static async updateComment(
    commentId: string,
    content: string
  ): Promise<WikiAPIResponse<WikiComment>> {
    try {
      const { error } = await supabase
        .from('wiki_comments')
        .update({
          content,
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId);

      if (error) throw error;

      const { data: updatedComment } = await supabase
        .from('wiki_comments_with_authors')
        .select('*')
        .eq('id', commentId)
        .single();

      return {
        data: updatedComment as WikiComment,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.updateComment:', error);
      return {
        data: {} as WikiComment,
        success: false,
        error: {
          code: 'UPDATE_COMMENT_ERROR',
          message: 'Impossible de mettre à jour le commentaire'
        }
      };
    }
  }

  /**
   * Supprime un commentaire
   */
  static async deleteComment(commentId: string): Promise<WikiAPIResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('wiki_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      return {
        data: true,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.deleteComment:', error);
      return {
        data: false,
        success: false,
        error: {
          code: 'DELETE_COMMENT_ERROR',
          message: 'Impossible de supprimer le commentaire'
        }
      };
    }
  }

  /**
   * Marque un commentaire comme résolu/non résolu
   */
  static async toggleCommentResolved(commentId: string): Promise<WikiAPIResponse<WikiComment>> {
    try {
      const { data: currentComment } = await supabase
        .from('wiki_comments')
        .select('is_resolved')
        .eq('id', commentId)
        .single();

      if (!currentComment) throw new Error('Commentaire non trouvé');

      const { error } = await supabase
        .from('wiki_comments')
        .update({ is_resolved: !currentComment.is_resolved })
        .eq('id', commentId);

      if (error) throw error;

      const { data: updatedComment } = await supabase
        .from('wiki_comments_with_authors')
        .select('*')
        .eq('id', commentId)
        .single();

      return {
        data: updatedComment as WikiComment,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.toggleCommentResolved:', error);
      return {
        data: {} as WikiComment,
        success: false,
        error: {
          code: 'TOGGLE_COMMENT_ERROR',
          message: 'Impossible de changer le statut du commentaire'
        }
      };
    }
  }

  // ====== RECHERCHE ======

  /**
   * Recherche dans le wiki
   */
  static async search(
    projectId: string,
    query: string,
    filters?: WikiSearchFilters
  ): Promise<WikiAPIResponse<WikiSearchResult[]>> {
    try {
      const startTime = Date.now();

      // Recherche dans les pages
      let pageQuery = supabase
        .from('wiki_pages')
        .select(`
          *,
          profiles!wiki_pages_author_id_fkey(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

      // Appliquer les filtres de recherche
      if (filters?.authors?.length) {
        pageQuery = pageQuery.in('author_id', filters.authors);
      }

      if (filters?.date_range) {
        pageQuery = pageQuery
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      const { data: pages, error } = await pageQuery.limit(50);
      if (error) throw error;

      // Calculer la pertinence et créer les résultats
      const results: WikiSearchResult[] = (pages || []).map(page => {
        const titleMatch = page.title.toLowerCase().includes(query.toLowerCase());
        const contentMatch = page.content.toLowerCase().includes(query.toLowerCase());

        let score = 0;
        if (titleMatch) score += 10;
        if (contentMatch) score += 5;
        if (page.is_public) score += 2;

        return {
          page: {
            ...page,
            author_name: page.profiles
              ? `${page.profiles.first_name || ''} ${page.profiles.last_name || ''}`.trim()
              : 'Utilisateur'
          },
          score,
          highlights: [],
          context: this.extractContext(page.content, query),
          match_type: titleMatch ? 'title' : 'content'
        };
      }).sort((a, b) => b.score - a.score);

      const searchTime = Date.now() - startTime;

      return {
        data: results,
        success: true,
        metadata: {
          total_count: results.length,
          // Vous pourriez ajouter des suggestions ici
        }
      };
    } catch (error) {
      console.error('WikiAPI.search:', error);
      return {
        data: [],
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Erreur lors de la recherche'
        }
      };
    }
  }

  // ====== NAVIGATION ======

  /**
   * Construit la navigation du wiki
   */
  static async getNavigation(projectId: string): Promise<WikiAPIResponse<WikiNavigation>> {
    try {
      const { data: pages } = await this.getPages(projectId);
      if (!pages.success) throw new Error('Impossible de récupérer les pages');

      // Construire l'arbre des pages
      const pagesTree = this.buildPagesTree(pages.data);

      // Récupérer les auteurs
      const authors = this.extractAuthors(pages.data);

      // Pages récentes
      const recentPages = [...pages.data]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10);

      const navigation: WikiNavigation = {
        pages: pagesTree,
        breadcrumb: [],
        current_page: null,
        authors,
        categories: [], // À implémenter si nécessaire
        recent_pages: recentPages,
        favorites: [] // À implémenter avec favoris utilisateur
      };

      return {
        data: navigation,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.getNavigation:', error);
      return {
        data: {} as WikiNavigation,
        success: false,
        error: {
          code: 'NAVIGATION_ERROR',
          message: 'Impossible de construire la navigation'
        }
      };
    }
  }

  // ====== STATISTIQUES ======

  /**
   * Récupère les statistiques du wiki
   */
  static async getStats(projectId: string): Promise<WikiAPIResponse<WikiStats>> {
    try {
      // Statistiques de base des pages
      const { data: pagesStats } = await supabase
        .from('wiki_pages')
        .select('id, is_public, view_count, created_at, author_id')
        .eq('project_id', projectId);

      // Statistiques des commentaires
      const { data: commentsStats } = await supabase
        .from('wiki_comments')
        .select('id, page_id, created_at')
        .in('page_id', (pagesStats || []).map(p => p.id));

      const totalPages = pagesStats?.length || 0;
      const publicPages = pagesStats?.filter(p => p.is_public).length || 0;
      const privatePages = totalPages - publicPages;
      const totalComments = commentsStats?.length || 0;
      const totalViews = pagesStats?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
      const uniqueAuthors = new Set(pagesStats?.map(p => p.author_id)).size;

      // Pages les plus vues
      const mostViewedPages = [...(pagesStats || [])]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5);

      // Activité récente (simplifié)
      const recentActivity: WikiActivity[] = [];

      const stats: WikiStats = {
        total_pages: totalPages,
        public_pages: publicPages,
        private_pages: privatePages,
        total_comments: totalComments,
        total_authors: uniqueAuthors,
        total_views: totalViews,
        average_reading_time: 0, // À calculer si nécessaire
        most_viewed_pages: [],
        most_commented_pages: [],
        recent_activity: recentActivity,
        growth_stats: {
          pages_this_week: 0,
          pages_this_month: 0,
          comments_this_week: 0,
          comments_this_month: 0,
          active_contributors: uniqueAuthors,
          growth_rate: 0
        }
      };

      return {
        data: stats,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.getStats:', error);
      return {
        data: {} as WikiStats,
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Impossible de récupérer les statistiques'
        }
      };
    }
  }

  // ====== VERSIONS ======

  /**
   * Crée une nouvelle version d'une page
   */
  static async createVersion(
    pageId: string,
    summary?: string,
    isMajor = false
  ): Promise<WikiAPIResponse<WikiVersion>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data: page } = await supabase
        .from('wiki_pages')
        .select('title, content, version')
        .eq('id', pageId)
        .single();

      if (!page) throw new Error('Page non trouvée');

      const { data, error } = await supabase
        .from('wiki_versions')
        .insert({
          page_id: pageId,
          version: page.version,
          title: page.title,
          content: page.content,
          changed_by: user.id,
          change_summary: summary,
          is_major: isMajor
        })
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as WikiVersion,
        success: true
      };
    } catch (error) {
      console.error('WikiAPI.createVersion:', error);
      return {
        data: {} as WikiVersion,
        success: false,
        error: {
          code: 'CREATE_VERSION_ERROR',
          message: 'Impossible de créer la version'
        }
      };
    }
  }

  // ====== UTILITAIRES PRIVÉS ======

  private static buildPagesTree(flatPages: WikiPage[]): WikiPage[] {
    const pageMap = new Map<string, WikiPage>();
    const rootPages: WikiPage[] = [];

    // Créer une map de toutes les pages
    flatPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Construire l'arbre
    flatPages.forEach(page => {
      const pageNode = pageMap.get(page.id)!;
      if (page.parent_id && pageMap.has(page.parent_id)) {
        const parent = pageMap.get(page.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(pageNode);
      } else {
        rootPages.push(pageNode);
      }
    });

    return rootPages;
  }

  private static buildCommentsTree(flatComments: any[]): WikiComment[] {
    const commentMap = new Map<string, WikiComment>();
    const rootComments: WikiComment[] = [];

    // Créer une map de tous les commentaires
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Construire l'arbre
    flatComments.forEach(comment => {
      const commentNode = commentMap.get(comment.id)!;
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        const parent = commentMap.get(comment.parent_comment_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(commentNode);
      } else if (!comment.parent_comment_id) {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  }

  private static extractAuthors(pages: WikiPage[]): WikiAuthor[] {
    const authorsMap = new Map<string, WikiAuthor>();

    pages.forEach(page => {
      const authorId = page.author_id;
      if (!authorsMap.has(authorId)) {
        authorsMap.set(authorId, {
          id: authorId,
          name: page.author_name || 'Utilisateur',
          email: page.author_email,
          pages_count: 0,
          is_current_user: false, // À déterminer dans le hook
          pages: []
        });
      }

      const author = authorsMap.get(authorId)!;
      author.pages_count++;
      author.pages.push(page);
    });

    return Array.from(authorsMap.values());
  }

  private static extractContext(content: string, query: string, contextLength = 150): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.substring(0, contextLength) + '...';

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + query.length + contextLength / 2);

    return (start > 0 ? '...' : '') +
           content.substring(start, end) +
           (end < content.length ? '...' : '');
  }

  private static async incrementViewCount(pageId: string): Promise<void> {
    try {
      await supabase.rpc('increment_wiki_page_views', { page_id: pageId });
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
  }
}