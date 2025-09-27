/**
 * Module ÉVALUATIONS - Service API
 *
 * Service centralisé pour toutes les interactions avec l'API Supabase
 * concernant les évaluations, notes et commentaires.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TaskRating,
  TaskComment,
  EvaluationItem,
  EvaluationStats,
  EvaluationFilters,
  EvaluationAPIResponse,
  EvaluationPaginatedResponse,
  EvaluationExport,
  EvaluationExportFormat,
  CreateRatingData,
  UpdateRatingData,
  MonthlyEvaluationStats,
  ProjectEvaluationStats,
  ClientEvaluationStats,
  RatingDistribution,
  EvaluationError,
  EvaluationErrorCode
} from '../types';

export class EvaluationsAPI {
  /**
   * Crée une erreur formatée pour le module
   */
  private static createError(
    code: EvaluationErrorCode,
    message: string,
    details?: Record<string, any>
  ): EvaluationError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gère les erreurs Supabase et les convertit en EvaluationError
   */
  private static handleSupabaseError(error: any): EvaluationError {
    console.error('Supabase error:', error);

    if (error?.code === 'PGRST116') {
      return this.createError('RATING_NOT_FOUND', 'Évaluation non trouvée');
    }

    if (error?.code === '23505') {
      return this.createError('ALREADY_RATED', 'Cette tâche a déjà été évaluée');
    }

    if (error?.code === '23503') {
      return this.createError('TASK_NOT_FOUND', 'Tâche non trouvée');
    }

    if (error?.message?.includes('permission')) {
      return this.createError('PERMISSION_DENIED', 'Permission refusée');
    }

    return this.createError(
      'DATABASE_ERROR',
      error?.message || 'Erreur de base de données',
      { originalError: error }
    );
  }

  // ==========================================
  // ÉVALUATIONS - LECTURE
  // ==========================================

  /**
   * Récupère les évaluations pour un candidat avec filtres et pagination
   */
  static async getEvaluations(
    candidateId: string,
    filters: EvaluationFilters = {}
  ): Promise<EvaluationPaginatedResponse<EvaluationItem>> {
    try {
      const {
        project_id,
        client_id,
        rating_min,
        rating_max,
        date_from,
        date_to,
        has_comment,
        sort_by = 'created_at',
        sort_order = 'desc',
        per_page = 20,
        page = 1
      } = filters;

      // D'abord, récupérer les évaluations
      let ratingsQuery = supabase
        .from('task_ratings')
        .select(`
          *,
          projects(title),
          kanban_cards(title)
        `)
        .eq('candidate_id', candidateId);

      // Appliquer les filtres
      if (project_id) ratingsQuery = ratingsQuery.eq('project_id', project_id);
      if (client_id) ratingsQuery = ratingsQuery.eq('client_id', client_id);
      if (rating_min) ratingsQuery = ratingsQuery.gte('rating', rating_min);
      if (rating_max) ratingsQuery = ratingsQuery.lte('rating', rating_max);
      if (date_from) ratingsQuery = ratingsQuery.gte('created_at', date_from);
      if (date_to) ratingsQuery = ratingsQuery.lte('created_at', date_to);
      if (has_comment !== undefined) {
        ratingsQuery = has_comment
          ? ratingsQuery.not('comment', 'is', null)
          : ratingsQuery.is('comment', null);
      }

      // Pagination
      const offset = (page - 1) * per_page;
      ratingsQuery = ratingsQuery
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + per_page - 1);

      const { data: ratingsData, error: ratingsError, count } = await ratingsQuery;

      if (ratingsError) {
        return {
          success: false,
          data: [],
          error: this.handleSupabaseError(ratingsError),
          pagination: {
            page,
            per_page,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false
          }
        };
      }

      // Transformer en EvaluationItem
      const evaluationItems: EvaluationItem[] = (ratingsData || []).map((rating: any) => ({
        id: rating.id,
        type: 'rating' as const,
        date: rating.created_at,
        project_id: rating.project_id,
        project_title: rating.projects?.title,
        rating: rating.rating,
        comment: rating.comment,
        task_title: rating.kanban_cards?.title,
        client_name: undefined // À enrichir si nécessaire
      }));

      // Calculer la pagination
      const total = count || 0;
      const total_pages = Math.ceil(total / per_page);

      return {
        success: true,
        data: evaluationItems,
        pagination: {
          page,
          per_page,
          total,
          total_pages,
          has_next: page < total_pages,
          has_prev: page > 1
        }
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        error: this.handleSupabaseError(error),
        pagination: {
          page: 1,
          per_page: 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    }
  }

  /**
   * Récupère une évaluation spécifique
   */
  static async getRating(ratingId: string): Promise<EvaluationAPIResponse<TaskRating>> {
    try {
      const { data, error } = await supabase
        .from('task_ratings')
        .select(`
          *,
          projects(title),
          kanban_cards(title)
        `)
        .eq('id', ratingId)
        .single();

      if (error) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.handleSupabaseError(error)
        };
      }

      const rating: TaskRating = {
        ...data,
        task_title: data.kanban_cards?.title,
        project_title: data.projects?.title
      };

      return { success: true, data: rating };

    } catch (error) {
      return {
        success: false,
        data: {} as TaskRating,
        error: this.handleSupabaseError(error)
      };
    }
  }

  /**
   * Récupère les évaluations par projet
   */
  static async getRatingsByProject(
    candidateId: string,
    projectId: string
  ): Promise<EvaluationAPIResponse<TaskRating[]>> {
    try {
      const { data, error } = await supabase
        .from('task_ratings')
        .select(`
          *,
          kanban_cards(title, priority)
        `)
        .eq('candidate_id', candidateId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          data: [],
          error: this.handleSupabaseError(error)
        };
      }

      const ratings: TaskRating[] = (data || []).map((rating: any) => ({
        ...rating,
        task_title: rating.kanban_cards?.title,
        task_priority: rating.kanban_cards?.priority
      }));

      return { success: true, data: ratings };

    } catch (error) {
      return {
        success: false,
        data: [],
        error: this.handleSupabaseError(error)
      };
    }
  }

  // ==========================================
  // ÉVALUATIONS - CRÉATION/MODIFICATION
  // ==========================================

  /**
   * Crée une nouvelle évaluation
   */
  static async createRating(data: CreateRatingData): Promise<EvaluationAPIResponse<TaskRating>> {
    try {
      // Validation
      if (data.rating < 1 || data.rating > 5) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.createError('INVALID_RATING', 'La note doit être entre 1 et 5')
        };
      }

      // Obtenir l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.createError('PERMISSION_DENIED', 'Utilisateur non connecté')
        };
      }

      const { data: newRating, error } = await supabase
        .from('task_ratings')
        .insert({
          task_id: data.task_id,
          project_id: data.project_id,
          candidate_id: data.candidate_id,
          client_id: user.id,
          rating: data.rating,
          comment: data.comment?.trim() || null
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.handleSupabaseError(error)
        };
      }

      // Créer une notification pour le candidat si nécessaire
      if (data.candidate_id) {
        await this.createRatingNotification(newRating, data.candidate_id, data.project_id);
      }

      return { success: true, data: newRating };

    } catch (error) {
      return {
        success: false,
        data: {} as TaskRating,
        error: this.handleSupabaseError(error)
      };
    }
  }

  /**
   * Met à jour une évaluation existante
   */
  static async updateRating(
    ratingId: string,
    data: UpdateRatingData
  ): Promise<EvaluationAPIResponse<TaskRating>> {
    try {
      // Validation
      if (data.rating && (data.rating < 1 || data.rating > 5)) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.createError('INVALID_RATING', 'La note doit être entre 1 et 5')
        };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.rating !== undefined) updateData.rating = data.rating;
      if (data.comment !== undefined) updateData.comment = data.comment?.trim() || null;

      const { data: updatedRating, error } = await supabase
        .from('task_ratings')
        .update(updateData)
        .eq('id', ratingId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          data: {} as TaskRating,
          error: this.handleSupabaseError(error)
        };
      }

      return { success: true, data: updatedRating };

    } catch (error) {
      return {
        success: false,
        data: {} as TaskRating,
        error: this.handleSupabaseError(error)
      };
    }
  }

  /**
   * Supprime une évaluation
   */
  static async deleteRating(ratingId: string): Promise<EvaluationAPIResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('task_ratings')
        .delete()
        .eq('id', ratingId);

      if (error) {
        return {
          success: false,
          data: false,
          error: this.handleSupabaseError(error)
        };
      }

      return { success: true, data: true };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: this.handleSupabaseError(error)
      };
    }
  }

  // ==========================================
  // STATISTIQUES
  // ==========================================

  /**
   * Récupère les statistiques complètes des évaluations
   */
  static async getEvaluationStats(candidateId: string): Promise<EvaluationAPIResponse<EvaluationStats>> {
    try {
      // Récupérer toutes les évaluations du candidat
      const { data: ratings, error: ratingsError } = await supabase
        .from('task_ratings')
        .select(`
          *,
          projects(title),
          kanban_cards(title)
        `)
        .eq('candidate_id', candidateId);

      if (ratingsError) {
        return {
          success: false,
          data: {} as EvaluationStats,
          error: this.handleSupabaseError(ratingsError)
        };
      }

      const ratingsData = ratings || [];

      // Calculer les statistiques de base
      const totalRatings = ratingsData.length;
      const averageRating = totalRatings > 0
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

      // Distribution des notes
      const ratingDistribution: RatingDistribution = {
        1: ratingsData.filter(r => r.rating === 1).length,
        2: ratingsData.filter(r => r.rating === 2).length,
        3: ratingsData.filter(r => r.rating === 3).length,
        4: ratingsData.filter(r => r.rating === 4).length,
        5: ratingsData.filter(r => r.rating === 5).length
      };

      // Statistiques mensuelles (derniers 6 mois)
      const monthlyStats = await this.calculateMonthlyStats(ratingsData);

      // Statistiques par projet
      const projectStats = await this.calculateProjectStats(ratingsData);

      // Tendance récente
      const { trend, percentage } = this.calculateTrend(monthlyStats);

      const stats: EvaluationStats = {
        total_ratings: totalRatings,
        average_rating: Number(averageRating.toFixed(2)),
        rating_distribution: ratingDistribution,
        total_comments: ratingsData.filter(r => r.comment).length,
        monthly_stats: monthlyStats,
        recent_trend: trend,
        trend_percentage: percentage,
        project_stats: projectStats,
        client_stats: [], // À implémenter si nécessaire
        tasks_rated: totalRatings,
        completion_rate: 0, // À calculer avec le nombre total de tâches
        response_rate: 0 // À calculer avec le nombre de clients
      };

      return { success: true, data: stats };

    } catch (error) {
      return {
        success: false,
        data: {} as EvaluationStats,
        error: this.handleSupabaseError(error)
      };
    }
  }

  /**
   * Calcule les statistiques mensuelles
   */
  private static calculateMonthlyStats(ratings: any[]): MonthlyEvaluationStats[] {
    const monthlyMap = new Map<string, { total: number; sum: number; comments: number }>();

    ratings.forEach(rating => {
      const date = new Date(rating.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { total: 0, sum: 0, comments: 0 });
      }

      const monthData = monthlyMap.get(key)!;
      monthData.total++;
      monthData.sum += rating.rating;
      if (rating.comment) monthData.comments++;
    });

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return Array.from(monthlyMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month: month + 1,
          month_name: monthNames[month],
          total_ratings: data.total,
          average_rating: Number((data.sum / data.total).toFixed(2)),
          total_comments: data.comments,
          tasks_completed: data.total,
          evaluation_rate: 100 // Supposer 100% pour l'instant
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .slice(-6); // Derniers 6 mois
  }

  /**
   * Calcule les statistiques par projet
   */
  private static calculateProjectStats(ratings: any[]): ProjectEvaluationStats[] {
    const projectMap = new Map<string, {
      title: string;
      ratings: number[];
      latestDate: string;
    }>();

    ratings.forEach(rating => {
      const projectId = rating.project_id;
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          title: rating.projects?.title || 'Projet sans nom',
          ratings: [],
          latestDate: rating.created_at
        });
      }

      const projectData = projectMap.get(projectId)!;
      projectData.ratings.push(rating.rating);
      if (rating.created_at > projectData.latestDate) {
        projectData.latestDate = rating.created_at;
      }
    });

    return Array.from(projectMap.entries()).map(([projectId, data]) => {
      const averageRating = data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length;

      let satisfaction: 'excellent' | 'good' | 'average' | 'poor' = 'poor';
      if (averageRating >= 4.5) satisfaction = 'excellent';
      else if (averageRating >= 3.5) satisfaction = 'good';
      else if (averageRating >= 2.5) satisfaction = 'average';

      return {
        project_id: projectId,
        project_title: data.title,
        total_ratings: data.ratings.length,
        average_rating: Number(averageRating.toFixed(2)),
        latest_rating_date: data.latestDate,
        tasks_completed: data.ratings.length,
        evaluation_rate: 100,
        client_satisfaction: satisfaction
      };
    });
  }

  /**
   * Calcule la tendance récente
   */
  private static calculateTrend(monthlyStats: MonthlyEvaluationStats[]): {
    trend: 'improving' | 'declining' | 'stable';
    percentage: number;
  } {
    if (monthlyStats.length < 2) {
      return { trend: 'stable', percentage: 0 };
    }

    const latest = monthlyStats[monthlyStats.length - 1];
    const previous = monthlyStats[monthlyStats.length - 2];

    const change = latest.average_rating - previous.average_rating;
    const percentage = Math.abs(change) / previous.average_rating * 100;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (change > 0.1) trend = 'improving';
    else if (change < -0.1) trend = 'declining';

    return { trend, percentage: Number(percentage.toFixed(1)) };
  }

  // ==========================================
  // EXPORT
  // ==========================================

  /**
   * Exporte les évaluations
   */
  static async exportEvaluations(
    candidateId: string,
    filters: EvaluationFilters,
    format: EvaluationExportFormat
  ): Promise<EvaluationAPIResponse<EvaluationExport>> {
    try {
      // Pour l'instant, simulation de l'export
      const exportData: EvaluationExport = {
        id: `export_${Date.now()}`,
        format,
        file_size: 15000, // 15KB simulé
        download_url: `#export-${format}-${Date.now()}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        generated_at: new Date().toISOString(),
        filters_applied: filters,
        total_records: 0 // À calculer
      };

      return { success: true, data: exportData };

    } catch (error) {
      return {
        success: false,
        data: {} as EvaluationExport,
        error: this.createError('EXPORT_FAILED', 'Échec de l\'export')
      };
    }
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Crée une notification pour le candidat
   */
  private static async createRatingNotification(
    rating: any,
    candidateId: string,
    projectId: string
  ): Promise<void> {
    try {
      // Obtenir les infos du projet et de la tâche
      const [{ data: project }, { data: task }] = await Promise.all([
        supabase.from('projects').select('title').eq('id', projectId).single(),
        supabase.from('kanban_cards').select('title').eq('id', rating.task_id).single()
      ]);

      // Obtenir le user_id du candidat
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', candidateId)
        .single();

      if (candidateProfile) {
        await supabase
          .from('notifications')
          .insert({
            user_id: candidateId,
            type: 'success',
            priority: 'high',
            title: 'Nouvelle évaluation reçue',
            message: `Vous avez reçu une évaluation de ${rating.rating}/5 étoiles pour "${task?.title || 'une tâche'}"${project ? ` du projet ${project.title}` : ''}`,
            data: {
              notification_type: 'task_rated',
              task_id: rating.task_id,
              project_id: projectId,
              rating: rating.rating,
              has_comment: !!rating.comment
            },
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }
  }

  /**
   * Formate le label d'une note
   */
  static formatRatingLabel(rating: number): string {
    const labels = {
      1: 'Insuffisant',
      2: 'Moyen',
      3: 'Bien',
      4: 'Très bien',
      5: 'Excellent'
    };
    return labels[rating as keyof typeof labels] || '';
  }

  /**
   * Calcule la moyenne des notes
   */
  static calculateAverageRating(ratings: TaskRating[]): number {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
    return Number((sum / ratings.length).toFixed(2));
  }

  /**
   * Détermine la couleur d'une note
   */
  static getRatingColor(rating: number): string {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    if (rating >= 2) return 'text-orange-600';
    return 'text-red-600';
  }
}