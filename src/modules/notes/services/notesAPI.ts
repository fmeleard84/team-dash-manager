/**
 * Module NOTES - Service API
 *
 * Ce service centralise toutes les interactions avec l'API Supabase pour le module Notes.
 * Il gère les notes personnelles, carnets, tags, recherche et export.
 *
 * Principe : Aucun composant ne fait d'appel direct à Supabase.
 * Tout passe par ce service pour maintenir la cohérence et faciliter la maintenance.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  Note,
  Notebook,
  NoteTag,
  NoteStats,
  NoteFilters,
  CreateNoteData,
  UpdateNoteData,
  CreateNotebookData,
  UpdateNotebookData,
  NoteAPIResponse,
  NotePaginatedResponse,
  NoteError,
  NoteErrorCode,
  NoteExport,
  NoteExportFormat,
  NoteSearchResult,
  NoteBackup,
  NoteTemplate,
  ChecklistItem,
  NOTE_CONSTANTS
} from '../types';

export class NotesAPI {
  // ==========================================
  // PRIVATE UTILITY METHODS
  // ==========================================

  /**
   * Crée une réponse API standardisée
   */
  private static createResponse<T>(
    data: T,
    success: boolean = true,
    message?: string,
    error?: NoteError
  ): NoteAPIResponse<T> {
    return { data, success, message, error };
  }

  /**
   * Gère les erreurs Supabase et les convertit en NoteError
   */
  private static handleError(error: any, context: string): NoteError {
    console.error(`[NotesAPI] ${context}:`, error);

    if (!error) {
      return {
        code: 'DATABASE_ERROR',
        message: 'Erreur inconnue'
      };
    }

    // Mapping des codes d'erreur PostgreSQL
    const postgresErrorMap: Record<string, NoteErrorCode> = {
      '23505': 'DUPLICATE_NAME', // Unique violation
      '23503': 'NOTE_NOT_FOUND', // Foreign key violation
      '42703': 'DATABASE_ERROR', // Undefined column
      'PGRST116': 'NOTE_NOT_FOUND' // Row not found
    };

    const code = postgresErrorMap[error.code] || 'DATABASE_ERROR';

    return {
      code,
      message: error.message || 'Erreur de base de données',
      details: { originalError: error, context }
    };
  }

  /**
   * Valide les données d'une note
   */
  private static validateNoteData(data: CreateNoteData): NoteError | null {
    if (!data.title?.trim()) {
      return {
        code: 'TITLE_REQUIRED',
        message: 'Le titre est requis',
        field: 'title'
      };
    }

    if (data.title.length > NOTE_CONSTANTS.LIMITS.TITLE_MAX_LENGTH) {
      return {
        code: 'VALIDATION_ERROR',
        message: `Le titre ne peut pas dépasser ${NOTE_CONSTANTS.LIMITS.TITLE_MAX_LENGTH} caractères`,
        field: 'title'
      };
    }

    if (data.content && data.content.length > NOTE_CONSTANTS.LIMITS.CONTENT_MAX_LENGTH) {
      return {
        code: 'CONTENT_TOO_LONG',
        message: `Le contenu ne peut pas dépasser ${NOTE_CONSTANTS.LIMITS.CONTENT_MAX_LENGTH} caractères`,
        field: 'content'
      };
    }

    if (data.tags && data.tags.length > NOTE_CONSTANTS.LIMITS.MAX_TAGS_PER_NOTE) {
      return {
        code: 'VALIDATION_ERROR',
        message: `Maximum ${NOTE_CONSTANTS.LIMITS.MAX_TAGS_PER_NOTE} tags par note`,
        field: 'tags'
      };
    }

    return null;
  }

  /**
   * Construit une requête avec filtres pour les notes
   */
  private static applyNoteFilters(query: any, filters: NoteFilters) {
    if (filters.notebook_id) {
      query = query.eq('notebook_id', filters.notebook_id);
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.is_pinned !== undefined) {
      query = query.eq('is_pinned', filters.is_pinned);
    }

    if (filters.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    if (filters.updated_after) {
      query = query.gte('updated_at', filters.updated_after);
    }

    if (filters.updated_before) {
      query = query.lte('updated_at', filters.updated_before);
    }

    if (filters.min_word_count) {
      query = query.gte('word_count', filters.min_word_count);
    }

    if (filters.max_word_count) {
      query = query.lte('word_count', filters.max_word_count);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.color) {
      query = query.eq('color', filters.color);
    }

    if (filters.search) {
      // Recherche dans le titre et le contenu
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Pagination
    if (filters.page && filters.per_page) {
      const offset = (filters.page - 1) * filters.per_page;
      query = query.range(offset, offset + filters.per_page - 1);
    }

    // Tri
    const sortBy = filters.sort_by || 'updated_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    return query;
  }

  /**
   * Calcule l'extrait et les métriques d'une note
   */
  private static calculateNoteMetrics(content: string, title: string) {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = content.length;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // 200 mots par minute

    // Créer un extrait (sans markdown)
    const plainContent = content.replace(/[#*`_~\[\]()]/g, '').replace(/\n+/g, ' ');
    const excerpt = plainContent.length > NOTE_CONSTANTS.LIMITS.EXCERPT_LENGTH
      ? plainContent.substring(0, NOTE_CONSTANTS.LIMITS.EXCERPT_LENGTH) + '...'
      : plainContent;

    return {
      word_count: wordCount,
      character_count: characterCount,
      read_time_minutes: readTimeMinutes,
      excerpt: excerpt || `${title} - Note vide`
    };
  }

  // ==========================================
  // NOTES - CRUD OPERATIONS
  // ==========================================

  /**
   * Récupère les notes avec filtres
   */
  static async getNotes(
    candidateId: string,
    filters: NoteFilters = {}
  ): Promise<NoteAPIResponse<NotePaginatedResponse<Note>>> {
    try {
      // Requête de base avec jointures
      let query = supabase
        .from('candidate_notes')
        .select(`
          *,
          notebooks:notebook_id (
            name
          ),
          projects:project_id (
            title
          ),
          tasks:task_id (
            title
          )
        `)
        .eq('candidate_id', candidateId);

      // Ne pas inclure les notes supprimées par défaut
      if (!filters.include_deleted) {
        query = query.neq('status', 'deleted');
      }

      // Ne pas inclure les notes archivées par défaut
      if (!filters.include_archived) {
        query = query.neq('status', 'archived');
      }

      // Application des filtres
      query = this.applyNoteFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.createResponse(
          { data: [], total: 0, page: 1, per_page: 20, total_pages: 0, has_more: false, has_previous: false },
          false,
          undefined,
          this.handleError(error, 'getNotes')
        );
      }

      // Format des données
      const notes: Note[] = (data || []).map(note => ({
        id: note.id,
        candidate_id: note.candidate_id,
        notebook_id: note.notebook_id,
        project_id: note.project_id,
        task_id: note.task_id,
        title: note.title,
        content: note.content,
        format: note.format,
        excerpt: note.excerpt,
        type: note.type,
        status: note.status,
        priority: note.priority,
        is_pinned: note.is_pinned,
        is_favorite: note.is_favorite,
        tags: note.tags || [],
        color: note.color,
        is_shared: note.is_shared,
        reminder_at: note.reminder_at,
        due_date: note.due_date,
        word_count: note.word_count,
        character_count: note.character_count,
        read_time_minutes: note.read_time_minutes,
        created_at: note.created_at,
        updated_at: note.updated_at,
        last_opened_at: note.last_opened_at,
        // Relations enrichies
        notebook_name: note.notebooks?.name,
        project_title: note.projects?.title,
        task_title: note.tasks?.title
      }));

      const total = count || notes.length;
      const perPage = filters.per_page || 20;
      const currentPage = filters.page || 1;
      const totalPages = Math.ceil(total / perPage);

      return this.createResponse({
        data: notes,
        total,
        page: currentPage,
        per_page: perPage,
        total_pages: totalPages,
        has_more: currentPage < totalPages,
        has_previous: currentPage > 1
      });

    } catch (error) {
      return this.createResponse(
        { data: [], total: 0, page: 1, per_page: 20, total_pages: 0, has_more: false, has_previous: false },
        false,
        undefined,
        this.handleError(error, 'getNotes')
      );
    }
  }

  /**
   * Récupère une note spécifique
   */
  static async getNote(noteId: string): Promise<NoteAPIResponse<Note>> {
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .select(`
          *,
          notebooks:notebook_id (
            name
          ),
          projects:project_id (
            title
          ),
          tasks:task_id (
            title
          )
        `)
        .eq('id', noteId)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'getNote')
        );
      }

      // Mettre à jour last_opened_at
      await supabase
        .from('candidate_notes')
        .update({ last_opened_at: new Date().toISOString() })
        .eq('id', noteId);

      const note: Note = {
        id: data.id,
        candidate_id: data.candidate_id,
        notebook_id: data.notebook_id,
        project_id: data.project_id,
        task_id: data.task_id,
        title: data.title,
        content: data.content,
        format: data.format,
        excerpt: data.excerpt,
        type: data.type,
        status: data.status,
        priority: data.priority,
        is_pinned: data.is_pinned,
        is_favorite: data.is_favorite,
        tags: data.tags || [],
        color: data.color,
        is_shared: data.is_shared,
        reminder_at: data.reminder_at,
        due_date: data.due_date,
        word_count: data.word_count,
        character_count: data.character_count,
        read_time_minutes: data.read_time_minutes,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_opened_at: data.last_opened_at,
        // Relations enrichies
        notebook_name: data.notebooks?.name,
        project_title: data.projects?.title,
        task_title: data.tasks?.title
      };

      return this.createResponse(note, true, 'Note récupérée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'getNote')
      );
    }
  }

  /**
   * Crée une nouvelle note
   */
  static async createNote(
    candidateId: string,
    data: CreateNoteData
  ): Promise<NoteAPIResponse<Note>> {
    try {
      // Validation
      const validationError = this.validateNoteData(data);
      if (validationError) {
        return this.createResponse(null as any, false, undefined, validationError);
      }

      // Calculer les métriques
      const metrics = this.calculateNoteMetrics(data.content || '', data.title);

      const noteData = {
        candidate_id: candidateId,
        notebook_id: data.notebook_id,
        project_id: data.project_id,
        task_id: data.task_id,
        title: data.title,
        content: data.content || '',
        format: data.format || 'plain',
        excerpt: metrics.excerpt,
        type: data.type || 'text',
        status: data.status || 'active',
        priority: data.priority || 'medium',
        is_pinned: data.is_pinned || false,
        is_favorite: data.is_favorite || false,
        tags: data.tags || [],
        color: data.color,
        reminder_at: data.reminder_at,
        due_date: data.due_date,
        word_count: metrics.word_count,
        character_count: metrics.character_count,
        read_time_minutes: metrics.read_time_minutes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: note, error } = await supabase
        .from('candidate_notes')
        .insert(noteData)
        .select(`
          *,
          notebooks:notebook_id (
            name
          ),
          projects:project_id (
            title
          )
        `)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'createNote')
        );
      }

      const formattedNote: Note = {
        id: note.id,
        candidate_id: note.candidate_id,
        notebook_id: note.notebook_id,
        project_id: note.project_id,
        task_id: note.task_id,
        title: note.title,
        content: note.content,
        format: note.format,
        excerpt: note.excerpt,
        type: note.type,
        status: note.status,
        priority: note.priority,
        is_pinned: note.is_pinned,
        is_favorite: note.is_favorite,
        tags: note.tags || [],
        color: note.color,
        is_shared: note.is_shared,
        reminder_at: note.reminder_at,
        due_date: note.due_date,
        word_count: note.word_count,
        character_count: note.character_count,
        read_time_minutes: note.read_time_minutes,
        created_at: note.created_at,
        updated_at: note.updated_at,
        last_opened_at: note.last_opened_at,
        notebook_name: note.notebooks?.name,
        project_title: note.projects?.title
      };

      return this.createResponse(formattedNote, true, 'Note créée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'createNote')
      );
    }
  }

  /**
   * Met à jour une note
   */
  static async updateNote(
    noteId: string,
    data: UpdateNoteData
  ): Promise<NoteAPIResponse<Note>> {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // Recalculer les métriques si le contenu change
      if (data.content !== undefined || data.title) {
        const currentNote = await this.getNote(noteId);
        if (currentNote.success) {
          const newContent = data.content !== undefined ? data.content : currentNote.data.content;
          const newTitle = data.title || currentNote.data.title;
          const metrics = this.calculateNoteMetrics(newContent, newTitle);

          updateData.excerpt = metrics.excerpt;
          updateData.word_count = metrics.word_count;
          updateData.character_count = metrics.character_count;
          updateData.read_time_minutes = metrics.read_time_minutes;
        }
      }

      const { data: note, error } = await supabase
        .from('candidate_notes')
        .update(updateData)
        .eq('id', noteId)
        .select(`
          *,
          notebooks:notebook_id (
            name
          ),
          projects:project_id (
            title
          )
        `)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'updateNote')
        );
      }

      const formattedNote: Note = {
        id: note.id,
        candidate_id: note.candidate_id,
        notebook_id: note.notebook_id,
        project_id: note.project_id,
        task_id: note.task_id,
        title: note.title,
        content: note.content,
        format: note.format,
        excerpt: note.excerpt,
        type: note.type,
        status: note.status,
        priority: note.priority,
        is_pinned: note.is_pinned,
        is_favorite: note.is_favorite,
        tags: note.tags || [],
        color: note.color,
        is_shared: note.is_shared,
        reminder_at: note.reminder_at,
        due_date: note.due_date,
        word_count: note.word_count,
        character_count: note.character_count,
        read_time_minutes: note.read_time_minutes,
        created_at: note.created_at,
        updated_at: note.updated_at,
        last_opened_at: note.last_opened_at,
        notebook_name: note.notebooks?.name,
        project_title: note.projects?.title
      };

      return this.createResponse(formattedNote, true, 'Note mise à jour avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'updateNote')
      );
    }
  }

  /**
   * Supprime une note (soft delete)
   */
  static async deleteNote(noteId: string): Promise<NoteAPIResponse<void>> {
    try {
      const { error } = await supabase
        .from('candidate_notes')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'deleteNote')
        );
      }

      return this.createResponse(null as any, true, 'Note supprimée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'deleteNote')
      );
    }
  }

  // ==========================================
  // NOTEBOOKS - CRUD OPERATIONS
  // ==========================================

  /**
   * Récupère les carnets d'un candidat
   */
  static async getNotebooks(candidateId: string): Promise<NoteAPIResponse<Notebook[]>> {
    try {
      const { data, error } = await supabase
        .from('note_notebooks')
        .select(`
          *,
          notes_count:candidate_notes(count)
        `)
        .eq('candidate_id', candidateId)
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true });

      if (error) {
        return this.createResponse(
          [],
          false,
          undefined,
          this.handleError(error, 'getNotebooks')
        );
      }

      const notebooks: Notebook[] = (data || []).map(nb => ({
        id: nb.id,
        candidate_id: nb.candidate_id,
        name: nb.name,
        description: nb.description,
        color: nb.color,
        icon: nb.icon,
        is_default: nb.is_default,
        is_shared: nb.is_shared,
        parent_id: nb.parent_id,
        sort_order: nb.sort_order,
        notes_count: nb.notes_count?.[0]?.count || 0,
        total_words: 0, // À calculer si nécessaire
        last_activity: nb.updated_at,
        created_at: nb.created_at,
        updated_at: nb.updated_at
      }));

      return this.createResponse(notebooks, true, 'Carnets récupérés avec succès');

    } catch (error) {
      return this.createResponse(
        [],
        false,
        undefined,
        this.handleError(error, 'getNotebooks')
      );
    }
  }

  /**
   * Crée un nouveau carnet
   */
  static async createNotebook(
    candidateId: string,
    data: CreateNotebookData
  ): Promise<NoteAPIResponse<Notebook>> {
    try {
      const notebookData = {
        candidate_id: candidateId,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        parent_id: data.parent_id,
        is_default: false,
        is_shared: false,
        sort_order: 0, // À calculer selon la position
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: notebook, error } = await supabase
        .from('note_notebooks')
        .insert(notebookData)
        .select()
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'createNotebook')
        );
      }

      const formattedNotebook: Notebook = {
        id: notebook.id,
        candidate_id: notebook.candidate_id,
        name: notebook.name,
        description: notebook.description,
        color: notebook.color,
        icon: notebook.icon,
        is_default: notebook.is_default,
        is_shared: notebook.is_shared,
        parent_id: notebook.parent_id,
        sort_order: notebook.sort_order,
        notes_count: 0,
        total_words: 0,
        last_activity: notebook.updated_at,
        created_at: notebook.created_at,
        updated_at: notebook.updated_at
      };

      return this.createResponse(formattedNotebook, true, 'Carnet créé avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'createNotebook')
      );
    }
  }

  // ==========================================
  // SEARCH OPERATIONS
  // ==========================================

  /**
   * Recherche avancée dans les notes
   */
  static async searchNotes(
    candidateId: string,
    query: string,
    filters: Partial<NoteFilters> = {}
  ): Promise<NoteAPIResponse<NoteSearchResult[]>> {
    try {
      if (query.length < NOTE_CONSTANTS.LIMITS.SEARCH_MIN_LENGTH) {
        return this.createResponse([], true, 'Recherche trop courte');
      }

      // Recherche dans le titre (plus de poids) et le contenu
      let searchQuery = supabase
        .from('candidate_notes')
        .select(`
          *,
          notebooks:notebook_id (
            name
          ),
          projects:project_id (
            title
          )
        `)
        .eq('candidate_id', candidateId)
        .neq('status', 'deleted')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`);

      // Appliquer les filtres supplémentaires
      if (filters.notebook_id) {
        searchQuery = searchQuery.eq('notebook_id', filters.notebook_id);
      }
      if (filters.type) {
        searchQuery = searchQuery.eq('type', filters.type);
      }
      if (filters.status) {
        searchQuery = searchQuery.eq('status', filters.status);
      }

      searchQuery = searchQuery.limit(NOTE_CONSTANTS.LIMITS.MAX_SEARCH_RESULTS);

      const { data, error } = await searchQuery;

      if (error) {
        return this.createResponse(
          [],
          false,
          undefined,
          this.handleError(error, 'searchNotes')
        );
      }

      // Calculer la pertinence et formater les résultats
      const results: NoteSearchResult[] = (data || []).map(note => {
        const matchedFields: string[] = [];
        let relevanceScore = 0;

        // Vérifier les correspondances dans le titre (poids: 3)
        if (note.title.toLowerCase().includes(query.toLowerCase())) {
          matchedFields.push('title');
          relevanceScore += 3;
        }

        // Vérifier les correspondances dans le contenu (poids: 1)
        if (note.content.toLowerCase().includes(query.toLowerCase())) {
          matchedFields.push('content');
          relevanceScore += 1;
        }

        // Vérifier les correspondances dans les tags (poids: 2)
        if (note.tags && note.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))) {
          matchedFields.push('tags');
          relevanceScore += 2;
        }

        // Générer un snippet de contexte
        const searchRegex = new RegExp(`(.{0,50})${query}(.{0,50})`, 'gi');
        const match = searchRegex.exec(note.content);
        const contextSnippet = match ? `...${match[1]}**${match[0]}**${match[2]}...` : note.excerpt;

        return {
          note: {
            id: note.id,
            candidate_id: note.candidate_id,
            notebook_id: note.notebook_id,
            project_id: note.project_id,
            task_id: note.task_id,
            title: note.title,
            content: note.content,
            format: note.format,
            excerpt: note.excerpt,
            type: note.type,
            status: note.status,
            priority: note.priority,
            is_pinned: note.is_pinned,
            is_favorite: note.is_favorite,
            tags: note.tags || [],
            color: note.color,
            reminder_at: note.reminder_at,
            due_date: note.due_date,
            word_count: note.word_count,
            character_count: note.character_count,
            read_time_minutes: note.read_time_minutes,
            created_at: note.created_at,
            updated_at: note.updated_at,
            last_opened_at: note.last_opened_at,
            notebook_name: note.notebooks?.name,
            project_title: note.projects?.title
          },
          relevance_score: relevanceScore,
          matched_fields: matchedFields,
          context_snippet: contextSnippet
        };
      })
      .sort((a, b) => b.relevance_score - a.relevance_score);

      return this.createResponse(results, true, `${results.length} résultat(s) trouvé(s)`);

    } catch (error) {
      return this.createResponse(
        [],
        false,
        undefined,
        this.handleError(error, 'searchNotes')
      );
    }
  }

  // ==========================================
  // STATS & ANALYTICS
  // ==========================================

  /**
   * Récupère les statistiques des notes
   */
  static async getNoteStats(candidateId: string): Promise<NoteAPIResponse<NoteStats>> {
    try {
      // Récupérer toutes les notes pour calculer les stats
      const notesResponse = await this.getNotes(candidateId, {
        per_page: 1000,
        include_archived: true
      });

      if (!notesResponse.success) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          notesResponse.error
        );
      }

      const notes = notesResponse.data.data;
      const notebooksResponse = await this.getNotebooks(candidateId);
      const notebooks = notebooksResponse.success ? notebooksResponse.data : [];

      // Calculs de base
      const totalNotes = notes.length;
      const totalWords = notes.reduce((sum, note) => sum + note.word_count, 0);
      const totalCharacters = notes.reduce((sum, note) => sum + note.character_count, 0);

      // Comptage par statut
      const draftNotes = notes.filter(n => n.status === 'draft').length;
      const activeNotes = notes.filter(n => n.status === 'active').length;
      const archivedNotes = notes.filter(n => n.status === 'archived').length;
      const pinnedNotes = notes.filter(n => n.is_pinned).length;
      const favoriteNotes = notes.filter(n => n.is_favorite).length;

      // Distribution par type
      const typeDistribution = this.calculateTypeDistribution(notes);

      // Activité mensuelle simple
      const monthlyActivity = this.calculateMonthlyActivity(notes);

      // Tags populaires
      const popularTags = this.calculatePopularTags(notes);

      const stats: NoteStats = {
        total_notes: totalNotes,
        total_notebooks: notebooks.length,
        total_words: totalWords,
        total_characters: totalCharacters,
        draft_notes: draftNotes,
        active_notes: activeNotes,
        archived_notes: archivedNotes,
        pinned_notes: pinnedNotes,
        favorite_notes: favoriteNotes,
        note_types_distribution: typeDistribution,
        notebook_distribution: [], // À implémenter si nécessaire
        daily_activity: [], // À implémenter si nécessaire
        weekly_activity: [], // À implémenter si nécessaire
        monthly_activity: monthlyActivity,
        popular_tags: popularTags,
        writing_streak: 0, // À calculer si nécessaire
        average_note_length: totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0,
        most_productive_day: '',
        most_productive_time: 14, // 14h par défaut
        vs_previous_month: {
          notes_created: 0,
          words_written: 0,
          change_percentage: 0,
          trend: 'stable'
        },
        recommendations: this.generateBasicRecommendations(notes)
      };

      return this.createResponse(stats, true, 'Statistiques calculées avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'getNoteStats')
      );
    }
  }

  // ==========================================
  // HELPER METHODS FOR STATISTICS
  // ==========================================

  private static calculateTypeDistribution(notes: Note[]) {
    const distribution = new Map<string, { count: number; totalWords: number }>();

    notes.forEach(note => {
      const type = note.type || 'text';
      const existing = distribution.get(type) || { count: 0, totalWords: 0 };
      existing.count += 1;
      existing.totalWords += note.word_count;
      distribution.set(type, existing);
    });

    return Array.from(distribution.entries()).map(([type, data]) => ({
      type: type as any,
      count: data.count,
      percentage: notes.length > 0 ? (data.count / notes.length) * 100 : 0,
      total_words: data.totalWords,
      average_length: data.count > 0 ? data.totalWords / data.count : 0
    }));
  }

  private static calculateMonthlyActivity(notes: Note[]) {
    const monthlyMap = new Map<string, { notesCreated: number; wordsWritten: number }>();

    notes.forEach(note => {
      const date = new Date(note.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(monthKey) || { notesCreated: 0, wordsWritten: 0 };
      existing.notesCreated += 1;
      existing.wordsWritten += note.word_count;
      monthlyMap.set(monthKey, existing);
    });

    return Array.from(monthlyMap.entries()).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-').map(Number);
      return {
        month: new Date(year, month - 1).toISOString(),
        year,
        notes_created: data.notesCreated,
        words_written: data.wordsWritten,
        growth_rate: 0 // À calculer si nécessaire
      };
    });
  }

  private static calculatePopularTags(notes: Note[]) {
    const tagCount = new Map<string, number>();

    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });
    });

    const totalTags = Array.from(tagCount.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(tagCount.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: totalTags > 0 ? (count / totalTags) * 100 : 0,
        recent_usage: true // À calculer selon la date
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static generateBasicRecommendations(notes: Note[]) {
    const recommendations = [];

    if (notes.length === 0) {
      recommendations.push({
        id: 'first_note',
        type: 'productivity',
        priority: 'high',
        title: 'Créez votre première note',
        description: 'Commencez à organiser vos idées en créant votre première note',
        action: 'Créer une nouvelle note',
        impact_level: 8
      });
    }

    const draftNotes = notes.filter(n => n.status === 'draft').length;
    if (draftNotes > 5) {
      recommendations.push({
        id: 'too_many_drafts',
        type: 'organization',
        priority: 'medium',
        title: 'Trop de brouillons',
        description: 'Vous avez beaucoup de brouillons. Pensez à les finaliser ou les archiver.',
        action: 'Réviser les brouillons',
        impact_level: 6
      });
    }

    const untaggedNotes = notes.filter(n => n.tags.length === 0).length;
    if (untaggedNotes > notes.length * 0.5) {
      recommendations.push({
        id: 'add_tags',
        type: 'organization',
        priority: 'low',
        title: 'Ajoutez des tags',
        description: 'Beaucoup de vos notes n\'ont pas de tags. Les tags facilitent la recherche.',
        action: 'Ajouter des tags aux notes',
        impact_level: 4
      });
    }

    return recommendations;
  }

  // ==========================================
  // EXPORT OPERATIONS
  // ==========================================

  /**
   * Exporte les notes selon le format spécifié
   */
  static async exportNotes(
    candidateId: string,
    filters: NoteFilters,
    format: NoteExportFormat
  ): Promise<NoteAPIResponse<NoteExport>> {
    try {
      const notesResponse = await this.getNotes(candidateId, {
        ...filters,
        per_page: 10000 // Large pour export complet
      });

      if (!notesResponse.success) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          notesResponse.error
        );
      }

      const notes = notesResponse.data.data;
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `notes_${candidateId}_${timestamp}.${format}`;

      // Génération du fichier selon le format
      let fileData: string;
      let mimeType: string;

      switch (format) {
        case 'markdown':
          fileData = this.generateMarkdown(notes);
          mimeType = 'text/markdown';
          break;
        case 'html':
          fileData = this.generateHTML(notes);
          mimeType = 'text/html';
          break;
        case 'json':
          fileData = JSON.stringify(notes, null, 2);
          mimeType = 'application/json';
          break;
        case 'txt':
          fileData = this.generatePlainText(notes);
          mimeType = 'text/plain';
          break;
        case 'pdf':
          // Le PDF nécessiterait une bibliothèque spécialisée
          return this.createResponse(
            null as any,
            false,
            undefined,
            {
              code: 'EXPORT_ERROR',
              message: 'Le format PDF n\'est pas encore supporté'
            }
          );
        default:
          return this.createResponse(
            null as any,
            false,
            undefined,
            {
              code: 'EXPORT_ERROR',
              message: 'Format d\'export non supporté'
            }
          );
      }

      // Créer l'objet export
      const exportData: NoteExport = {
        id: `export_${Date.now()}`,
        format,
        filename,
        file_url: `data:${mimeType};base64,${btoa(fileData)}`, // Data URL temporaire
        filters,
        total_notes: notes.length,
        total_notebooks: 0, // À calculer si nécessaire
        file_size: new Blob([fileData]).size,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        download_count: 0
      };

      return this.createResponse(exportData, true, 'Export généré avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'exportNotes')
      );
    }
  }

  // ==========================================
  // EXPORT FORMAT GENERATORS
  // ==========================================

  private static generateMarkdown(notes: Note[]): string {
    let markdown = '# Mes Notes\n\n';
    markdown += `Exporté le ${new Date().toLocaleDateString('fr-FR')}\n`;
    markdown += `${notes.length} note(s) exportée(s)\n\n`;

    notes.forEach(note => {
      markdown += `## ${note.title}\n\n`;
      markdown += `- **Type**: ${note.type}\n`;
      markdown += `- **Statut**: ${note.status}\n`;
      markdown += `- **Créé le**: ${new Date(note.created_at).toLocaleDateString('fr-FR')}\n`;
      if (note.tags.length > 0) {
        markdown += `- **Tags**: ${note.tags.join(', ')}\n`;
      }
      if (note.notebook_name) {
        markdown += `- **Carnet**: ${note.notebook_name}\n`;
      }
      markdown += '\n';
      markdown += note.content + '\n\n';
      markdown += '---\n\n';
    });

    return markdown;
  }

  private static generateHTML(notes: Note[]): string {
    let html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mes Notes</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .note { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 5px; }
          .note-title { color: #333; margin-bottom: 10px; }
          .note-meta { color: #666; font-size: 0.9em; margin-bottom: 15px; }
          .note-content { line-height: 1.6; }
          .tag { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; margin-right: 5px; }
        </style>
      </head>
      <body>
        <h1>Mes Notes</h1>
        <p>Exporté le ${new Date().toLocaleDateString('fr-FR')} - ${notes.length} note(s)</p>
    `;

    notes.forEach(note => {
      html += `
        <div class="note">
          <h2 class="note-title">${note.title}</h2>
          <div class="note-meta">
            <strong>Type:</strong> ${note.type} |
            <strong>Statut:</strong> ${note.status} |
            <strong>Créé le:</strong> ${new Date(note.created_at).toLocaleDateString('fr-FR')}
            ${note.notebook_name ? `| <strong>Carnet:</strong> ${note.notebook_name}` : ''}
            ${note.tags.length > 0 ? `<br><strong>Tags:</strong> ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}` : ''}
          </div>
          <div class="note-content">${note.content.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    });

    html += '</body></html>';
    return html;
  }

  private static generatePlainText(notes: Note[]): string {
    let text = 'MES NOTES\n';
    text += '=========\n\n';
    text += `Exporté le ${new Date().toLocaleDateString('fr-FR')}\n`;
    text += `${notes.length} note(s) exportée(s)\n\n`;

    notes.forEach(note => {
      text += `${note.title.toUpperCase()}\n`;
      text += '-'.repeat(note.title.length) + '\n\n';
      text += `Type: ${note.type}\n`;
      text += `Statut: ${note.status}\n`;
      text += `Créé le: ${new Date(note.created_at).toLocaleDateString('fr-FR')}\n`;
      if (note.tags.length > 0) {
        text += `Tags: ${note.tags.join(', ')}\n`;
      }
      if (note.notebook_name) {
        text += `Carnet: ${note.notebook_name}\n`;
      }
      text += '\n';
      text += note.content + '\n\n';
      text += '=' + '='.repeat(50) + '\n\n';
    });

    return text;
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Formate un aperçu de note
   */
  static formatNotePreview(content: string, maxLength: number = 100): string {
    const plainContent = content.replace(/[#*`_~\[\]()]/g, '').replace(/\n+/g, ' ').trim();

    if (plainContent.length <= maxLength) {
      return plainContent;
    }

    return plainContent.substring(0, maxLength) + '...';
  }

  /**
   * Calcule le temps de lecture estimé
   */
  static calculateReadTime(content: string): number {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    return Math.max(1, Math.ceil(wordCount / 200)); // 200 mots par minute
  }

  /**
   * Extrait les tags du contenu (hashtags)
   */
  static extractTags(content: string): string[] {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1].toLowerCase();
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Génère un slug à partir d'un titre
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/[\s_-]+/g, '-') // Remplacer espaces et underscores par des tirets
      .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début/fin
  }
}