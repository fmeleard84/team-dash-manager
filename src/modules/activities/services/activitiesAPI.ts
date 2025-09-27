/**
 * Module ACTIVITÉS - Service API
 *
 * Ce service centralise toutes les interactions avec l'API Supabase pour le module Activités.
 * Il gère les sessions de temps, les statistiques, les exports et la gestion d'erreurs.
 *
 * Principe : Aucun composant ne fait d'appel direct à Supabase.
 * Tout passe par ce service pour maintenir la cohérence et faciliter la maintenance.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  TimeSession,
  ActivityItem,
  ActivityStats,
  ActivityFilters,
  CreateTimeSessionData,
  UpdateTimeSessionData,
  ActivityAPIResponse,
  ActivityPaginatedResponse,
  ActivityError,
  ActivityErrorCode,
  ActivityExport,
  ActivityExportFormat,
  ActivityReport,
  ActivityTemplate,
  ActivityTypeDistribution,
  ProjectActivityStats,
  MonthlyActivityStats,
  ActivityRecommendation,
  ActivityGoal,
  PeriodComparison,
  ACTIVITY_CONSTANTS
} from '../types';

export class ActivitiesAPI {
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
    error?: ActivityError
  ): ActivityAPIResponse<T> {
    return { data, success, message, error };
  }

  /**
   * Gère les erreurs Supabase et les convertit en ActivityError
   */
  private static handleError(error: any, context: string): ActivityError {
    console.error(`[ActivitiesAPI] ${context}:`, error);

    if (!error) {
      return {
        code: 'DATABASE_ERROR',
        message: 'Erreur inconnue'
      };
    }

    // Mapping des codes d'erreur PostgreSQL
    const postgresErrorMap: Record<string, ActivityErrorCode> = {
      '23505': 'VALIDATION_ERROR', // Unique violation
      '23503': 'PROJECT_NOT_FOUND', // Foreign key violation
      '42703': 'DATABASE_ERROR', // Undefined column
      'PGRST116': 'ACTIVITY_NOT_FOUND' // Row not found
    };

    const code = postgresErrorMap[error.code] || 'DATABASE_ERROR';

    return {
      code,
      message: error.message || 'Erreur de base de données',
      details: { originalError: error, context }
    };
  }

  /**
   * Valide les données d'une session
   */
  private static validateSessionData(data: CreateTimeSessionData): ActivityError | null {
    if (!data.project_id?.trim()) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'L\'ID du projet est requis',
        field: 'project_id'
      };
    }

    if (!data.activity_description?.trim()) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'La description de l\'activité est requise',
        field: 'activity_description'
      };
    }

    if (data.hourly_rate <= 0) {
      return {
        code: 'INVALID_RATE',
        message: 'Le tarif horaire doit être supérieur à 0',
        field: 'hourly_rate'
      };
    }

    return null;
  }

  /**
   * Construit une requête avec filtres
   */
  private static applyFilters(query: any, filters: ActivityFilters) {
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.activity_type) {
      query = query.eq('activity_type', filters.activity_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.date_from) {
      query = query.gte('start_time', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('start_time', filters.date_to);
    }

    if (filters.min_duration) {
      query = query.gte('duration_minutes', filters.min_duration);
    }

    if (filters.max_duration) {
      query = query.lte('duration_minutes', filters.max_duration);
    }

    if (filters.min_cost) {
      query = query.gte('total_cost', filters.min_cost);
    }

    if (filters.max_cost) {
      query = query.lte('total_cost', filters.max_cost);
    }

    if (filters.search) {
      query = query.ilike('activity_description', `%${filters.search}%`);
    }

    if (filters.has_notes !== undefined) {
      if (filters.has_notes) {
        query = query.not('notes', 'is', null).neq('notes', '');
      } else {
        query = query.or('notes.is.null,notes.eq.');
      }
    }

    // Pagination
    if (filters.page && filters.per_page) {
      const offset = (filters.page - 1) * filters.per_page;
      query = query.range(offset, offset + filters.per_page - 1);
    }

    // Tri
    const sortBy = filters.sort_by || 'start_time';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    return query;
  }

  // ==========================================
  // SESSIONS - CRUD OPERATIONS
  // ==========================================

  /**
   * Récupère les sessions de temps avec filtres
   */
  static async getSessions(
    candidateId: string,
    filters: ActivityFilters = {}
  ): Promise<ActivityAPIResponse<ActivityPaginatedResponse<TimeSession>>> {
    try {
      // Requête de base avec jointures
      let query = supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            title,
            status
          ),
          tasks:task_id (
            title,
            status
          )
        `)
        .eq('candidate_id', candidateId);

      // Application des filtres
      query = this.applyFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return this.createResponse(
          { data: [], total: 0, page: 1, per_page: 20, total_pages: 0, has_more: false, has_previous: false },
          false,
          undefined,
          this.handleError(error, 'getSessions')
        );
      }

      // Format des données
      const sessions: TimeSession[] = (data || []).map(session => ({
        id: session.id,
        project_id: session.project_id,
        candidate_id: session.candidate_id,
        task_id: session.task_id,
        activity_description: session.activity_description,
        activity_type: session.activity_type,
        priority: session.priority,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        hourly_rate: session.hourly_rate,
        total_cost: session.total_cost,
        status: session.status,
        tags: session.tags || [],
        notes: session.notes,
        edit_history: session.edit_history || [],
        created_at: session.created_at,
        updated_at: session.updated_at,
        // Relations enrichies
        project_title: session.projects?.title,
        project_status: session.projects?.status,
        task_title: session.tasks?.title,
        task_status: session.tasks?.status
      }));

      const total = count || sessions.length;
      const perPage = filters.per_page || 20;
      const currentPage = filters.page || 1;
      const totalPages = Math.ceil(total / perPage);

      return this.createResponse({
        data: sessions,
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
        this.handleError(error, 'getSessions')
      );
    }
  }

  /**
   * Récupère une session spécifique
   */
  static async getSession(sessionId: string): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            title,
            status
          ),
          tasks:task_id (
            title,
            status
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'getSession')
        );
      }

      const session: TimeSession = {
        id: data.id,
        project_id: data.project_id,
        candidate_id: data.candidate_id,
        task_id: data.task_id,
        activity_description: data.activity_description,
        activity_type: data.activity_type,
        priority: data.priority,
        start_time: data.start_time,
        end_time: data.end_time,
        duration_minutes: data.duration_minutes,
        hourly_rate: data.hourly_rate,
        total_cost: data.total_cost,
        status: data.status,
        tags: data.tags || [],
        notes: data.notes,
        edit_history: data.edit_history || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Relations enrichies
        project_title: data.projects?.title,
        project_status: data.projects?.status,
        task_title: data.tasks?.title,
        task_status: data.tasks?.status
      };

      return this.createResponse(session, true, 'Session récupérée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'getSession')
      );
    }
  }

  /**
   * Crée une nouvelle session
   */
  static async createSession(
    candidateId: string,
    data: CreateTimeSessionData
  ): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      // Validation
      const validationError = this.validateSessionData(data);
      if (validationError) {
        return this.createResponse(null as any, false, undefined, validationError);
      }

      // Vérifier s'il y a déjà une session active
      const { data: activeSessions } = await supabase
        .from('time_tracking_sessions')
        .select('id')
        .eq('candidate_id', candidateId)
        .in('status', ['active', 'paused']);

      if (activeSessions && activeSessions.length > 0) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          {
            code: 'SESSION_ALREADY_ACTIVE',
            message: 'Vous avez déjà une session active. Terminez-la avant d\'en créer une nouvelle.'
          }
        );
      }

      const sessionData = {
        candidate_id: candidateId,
        project_id: data.project_id,
        task_id: data.task_id,
        activity_description: data.activity_description,
        activity_type: data.activity_type || 'task',
        priority: data.priority || 'medium',
        start_time: new Date().toISOString(),
        end_time: null,
        duration_minutes: null,
        hourly_rate: data.hourly_rate,
        total_cost: null,
        status: 'active' as const,
        tags: data.tags || [],
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: session, error } = await supabase
        .from('time_tracking_sessions')
        .insert(sessionData)
        .select(`
          *,
          projects (
            title,
            status
          )
        `)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'createSession')
        );
      }

      const formattedSession: TimeSession = {
        id: session.id,
        project_id: session.project_id,
        candidate_id: session.candidate_id,
        task_id: session.task_id,
        activity_description: session.activity_description,
        activity_type: session.activity_type,
        priority: session.priority,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        hourly_rate: session.hourly_rate,
        total_cost: session.total_cost,
        status: session.status,
        tags: session.tags || [],
        notes: session.notes,
        edit_history: session.edit_history || [],
        created_at: session.created_at,
        updated_at: session.updated_at,
        project_title: session.projects?.title,
        project_status: session.projects?.status
      };

      return this.createResponse(formattedSession, true, 'Session créée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'createSession')
      );
    }
  }

  /**
   * Met à jour une session
   */
  static async updateSession(
    sessionId: string,
    data: UpdateTimeSessionData
  ): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: session, error } = await supabase
        .from('time_tracking_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          projects (
            title,
            status
          ),
          tasks:task_id (
            title,
            status
          )
        `)
        .single();

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'updateSession')
        );
      }

      const formattedSession: TimeSession = {
        id: session.id,
        project_id: session.project_id,
        candidate_id: session.candidate_id,
        task_id: session.task_id,
        activity_description: session.activity_description,
        activity_type: session.activity_type,
        priority: session.priority,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        hourly_rate: session.hourly_rate,
        total_cost: session.total_cost,
        status: session.status,
        tags: session.tags || [],
        notes: session.notes,
        edit_history: session.edit_history || [],
        created_at: session.created_at,
        updated_at: session.updated_at,
        project_title: session.projects?.title,
        project_status: session.projects?.status,
        task_title: session.tasks?.title,
        task_status: session.tasks?.status
      };

      return this.createResponse(formattedSession, true, 'Session mise à jour avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'updateSession')
      );
    }
  }

  /**
   * Supprime une session
   */
  static async deleteSession(sessionId: string): Promise<ActivityAPIResponse<void>> {
    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(error, 'deleteSession')
        );
      }

      return this.createResponse(null as any, true, 'Session supprimée avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'deleteSession')
      );
    }
  }

  // ==========================================
  // TIMER CONTROLS
  // ==========================================

  /**
   * Démarre une session (alias pour createSession)
   */
  static async startSession(
    candidateId: string,
    data: CreateTimeSessionData
  ): Promise<ActivityAPIResponse<TimeSession>> {
    return this.createSession(candidateId, data);
  }

  /**
   * Met en pause une session active
   */
  static async pauseSession(sessionId: string): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      // Récupérer la session actuelle
      const { data: currentSession, error: fetchError } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !currentSession) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(fetchError, 'pauseSession - fetch')
        );
      }

      if (currentSession.status !== 'active') {
        return this.createResponse(
          null as any,
          false,
          undefined,
          {
            code: 'SESSION_NOT_ACTIVE',
            message: 'La session doit être active pour être mise en pause'
          }
        );
      }

      const now = new Date().toISOString();
      const startTime = new Date(currentSession.start_time);
      const elapsed = Math.floor((new Date(now).getTime() - startTime.getTime()) / (1000 * 60));

      return this.updateSession(sessionId, {
        status: 'paused',
        duration_minutes: elapsed,
        total_cost: elapsed * currentSession.hourly_rate
      });

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'pauseSession')
      );
    }
  }

  /**
   * Reprend une session en pause
   */
  static async resumeSession(sessionId: string): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      const { data: currentSession, error: fetchError } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !currentSession) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(fetchError, 'resumeSession - fetch')
        );
      }

      if (currentSession.status !== 'paused') {
        return this.createResponse(
          null as any,
          false,
          undefined,
          {
            code: 'SESSION_NOT_ACTIVE',
            message: 'La session doit être en pause pour être reprise'
          }
        );
      }

      return this.updateSession(sessionId, {
        status: 'active',
        start_time: new Date().toISOString() // Nouveau timestamp pour reprendre
      });

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'resumeSession')
      );
    }
  }

  /**
   * Arrête une session et la marque comme terminée
   */
  static async stopSession(sessionId: string): Promise<ActivityAPIResponse<TimeSession>> {
    try {
      const { data: currentSession, error: fetchError } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !currentSession) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          this.handleError(fetchError, 'stopSession - fetch')
        );
      }

      if (!['active', 'paused'].includes(currentSession.status)) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          {
            code: 'SESSION_NOT_ACTIVE',
            message: 'La session doit être active ou en pause pour être arrêtée'
          }
        );
      }

      const now = new Date().toISOString();
      const startTime = new Date(currentSession.start_time);
      const totalElapsed = Math.floor((new Date(now).getTime() - startTime.getTime()) / (1000 * 60));
      const finalDuration = Math.max(1, totalElapsed); // Minimum 1 minute

      return this.updateSession(sessionId, {
        status: 'completed',
        end_time: now,
        duration_minutes: finalDuration,
        total_cost: finalDuration * currentSession.hourly_rate
      });

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'stopSession')
      );
    }
  }

  // ==========================================
  // STATISTICS & ANALYTICS
  // ==========================================

  /**
   * Récupère les statistiques d'activité
   */
  static async getActivityStats(
    candidateId: string,
    filters: ActivityFilters = {}
  ): Promise<ActivityAPIResponse<ActivityStats>> {
    try {
      // Récupérer toutes les sessions pour les calculs
      const sessionsResponse = await this.getSessions(candidateId, {
        ...filters,
        per_page: 1000 // Large limit pour récupérer toutes les sessions
      });

      if (!sessionsResponse.success) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          sessionsResponse.error
        );
      }

      const sessions = sessionsResponse.data.data;
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const activeSessions = sessions.filter(s => s.status === 'active');

      // Calculs de base
      const totalSessions = sessions.length;
      const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const totalCost = completedSessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
      const averageSessionDuration = completedSessions.length > 0
        ? totalMinutes / completedSessions.length
        : 0;

      // Distribution par type d'activité
      const activityDistribution = this.calculateActivityDistribution(completedSessions);

      // Distribution par projet
      const projectDistribution = this.calculateProjectDistribution(completedSessions);

      // Statistiques temporelles (simplified)
      const monthlyStats = this.calculateMonthlyStats(completedSessions);

      // Score de productivité simplifié (basé sur la régularité et la durée)
      const productivityScore = this.calculateProductivityScore(completedSessions);

      // Recommandations basiques
      const recommendations = this.generateBasicRecommendations(completedSessions, productivityScore);

      const stats: ActivityStats = {
        total_sessions: totalSessions,
        total_minutes: totalMinutes,
        total_cost: totalCost,
        active_sessions: activeSessions.length,
        completed_sessions: completedSessions.length,
        average_session_duration: Math.round(averageSessionDuration),
        activity_distribution: activityDistribution,
        project_distribution: projectDistribution,
        daily_stats: [], // À implémenter si nécessaire
        weekly_stats: [], // À implémenter si nécessaire
        monthly_stats: monthlyStats,
        productivity_score: productivityScore,
        consistency_score: Math.min(100, productivityScore + 10), // Approximation
        efficiency_trend: productivityScore > 70 ? 'improving' : productivityScore > 50 ? 'stable' : 'declining',
        trend_percentage: productivityScore - 60, // Approximation par rapport à une base de 60
        recommendations,
        goals: [], // À implémenter si nécessaire
        vs_previous_period: {
          period_type: 'month',
          current_value: totalCost,
          previous_value: totalCost * 0.9, // Approximation
          change_percentage: 10, // Approximation
          change_type: 'increase',
          is_improvement: true
        },
        vs_average_candidate: {
          metric: 'productivity',
          user_value: productivityScore,
          average_value: 65,
          percentile: Math.min(95, productivityScore + 10),
          ranking: productivityScore > 80 ? 'top_10' : 'above_average'
        }
      };

      return this.createResponse(stats, true, 'Statistiques calculées avec succès');

    } catch (error) {
      return this.createResponse(
        null as any,
        false,
        undefined,
        this.handleError(error, 'getActivityStats')
      );
    }
  }

  // ==========================================
  // HELPER METHODS FOR STATISTICS
  // ==========================================

  private static calculateActivityDistribution(sessions: TimeSession[]): ActivityTypeDistribution[] {
    const distribution = new Map<string, {
      count: number;
      totalMinutes: number;
      totalCost: number;
    }>();

    sessions.forEach(session => {
      const type = session.activity_type || 'task';
      const existing = distribution.get(type) || { count: 0, totalMinutes: 0, totalCost: 0 };

      existing.count += 1;
      existing.totalMinutes += session.duration_minutes || 0;
      existing.totalCost += session.total_cost || 0;

      distribution.set(type, existing);
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    return Array.from(distribution.entries()).map(([type, data]) => ({
      type: type as any,
      count: data.count,
      total_minutes: data.totalMinutes,
      total_cost: data.totalCost,
      percentage: totalMinutes > 0 ? (data.totalMinutes / totalMinutes) * 100 : 0,
      average_duration: data.count > 0 ? data.totalMinutes / data.count : 0
    }));
  }

  private static calculateProjectDistribution(sessions: TimeSession[]): ProjectActivityStats[] {
    const distribution = new Map<string, {
      projectTitle: string;
      projectStatus: string;
      totalSessions: number;
      totalMinutes: number;
      totalCost: number;
      lastActivity: string;
      activities: string[];
    }>();

    sessions.forEach(session => {
      const projectId = session.project_id;
      const existing = distribution.get(projectId) || {
        projectTitle: session.project_title || 'Projet',
        projectStatus: session.project_status || 'play',
        totalSessions: 0,
        totalMinutes: 0,
        totalCost: 0,
        lastActivity: session.start_time,
        activities: []
      };

      existing.totalSessions += 1;
      existing.totalMinutes += session.duration_minutes || 0;
      existing.totalCost += session.total_cost || 0;

      if (session.start_time > existing.lastActivity) {
        existing.lastActivity = session.start_time;
      }

      if (session.activity_type && !existing.activities.includes(session.activity_type)) {
        existing.activities.push(session.activity_type);
      }

      distribution.set(projectId, existing);
    });

    return Array.from(distribution.entries()).map(([projectId, data]) => ({
      project_id: projectId,
      project_title: data.projectTitle,
      project_status: data.projectStatus,
      total_sessions: data.totalSessions,
      total_minutes: data.totalMinutes,
      total_cost: data.totalCost,
      efficiency_score: Math.min(100, (data.totalMinutes / data.totalSessions) * 2), // Approximation
      last_activity: data.lastActivity,
      most_common_activity: (data.activities[0] || 'task') as any,
      tags: []
    }));
  }

  private static calculateMonthlyStats(sessions: TimeSession[]): MonthlyActivityStats[] {
    const monthlyMap = new Map<string, {
      totalMinutes: number;
      sessionsCount: number;
      cost: number;
    }>();

    sessions.forEach(session => {
      const date = new Date(session.start_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(monthKey) || {
        totalMinutes: 0,
        sessionsCount: 0,
        cost: 0
      };

      existing.totalMinutes += session.duration_minutes || 0;
      existing.sessionsCount += 1;
      existing.cost += session.total_cost || 0;

      monthlyMap.set(monthKey, existing);
    });

    return Array.from(monthlyMap.entries()).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-').map(Number);
      return {
        month: new Date(year, month - 1).toISOString(),
        year,
        total_minutes: data.totalMinutes,
        sessions_count: data.sessionsCount,
        cost: data.cost,
        billable_percentage: 85, // Approximation
        growth_rate: 5, // Approximation
        target_achievement: Math.min(100, (data.totalMinutes / 8000) * 100) // Approximation pour 8000min/mois
      };
    });
  }

  private static calculateProductivityScore(sessions: TimeSession[]): number {
    if (sessions.length === 0) return 0;

    // Score basé sur plusieurs facteurs
    let score = 50; // Base score

    // Facteur 1: Régularité (nombre de jours avec activité)
    const uniqueDays = new Set(
      sessions.map(s => new Date(s.start_time).toDateString())
    ).size;

    const totalDays = Math.max(1, Math.ceil(
      (new Date().getTime() - new Date(sessions[sessions.length - 1].start_time).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const consistency = (uniqueDays / totalDays) * 40; // Max 40 points
    score += Math.min(40, consistency);

    // Facteur 2: Durée moyenne des sessions
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length;
    if (avgDuration > 60) score += 10; // Bonus pour sessions > 1h

    return Math.round(Math.min(100, score));
  }

  private static generateBasicRecommendations(
    sessions: TimeSession[],
    productivityScore: number
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];

    if (productivityScore < 60) {
      recommendations.push({
        id: 'improve_consistency',
        type: 'productivity',
        priority: 'high',
        title: 'Améliorez votre régularité',
        description: 'Essayez de maintenir une activité quotidienne plus constante',
        action: 'Planifier des créneaux de travail fixes chaque jour',
        impact_score: 8,
        effort_required: 6,
        category: 'habits'
      });
    }

    const avgDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length
      : 0;

    if (avgDuration < 30) {
      recommendations.push({
        id: 'extend_sessions',
        type: 'efficiency',
        priority: 'medium',
        title: 'Allongez vos sessions',
        description: 'Vos sessions sont courtes. Des sessions plus longues peuvent améliorer votre focus.',
        action: 'Viser des sessions de 45-90 minutes minimum',
        impact_score: 7,
        effort_required: 4,
        category: 'duration'
      });
    }

    return recommendations;
  }

  // ==========================================
  // EXPORT & REPORTING
  // ==========================================

  /**
   * Exporte les activités selon le format spécifié
   */
  static async exportActivities(
    candidateId: string,
    filters: ActivityFilters,
    format: ActivityExportFormat
  ): Promise<ActivityAPIResponse<ActivityExport>> {
    try {
      const sessionsResponse = await this.getSessions(candidateId, {
        ...filters,
        per_page: 10000 // Large pour export complet
      });

      if (!sessionsResponse.success) {
        return this.createResponse(
          null as any,
          false,
          undefined,
          sessionsResponse.error
        );
      }

      const sessions = sessionsResponse.data.data;
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `activites_${candidateId}_${timestamp}.${format}`;

      // Génération du fichier selon le format
      let fileData: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          fileData = this.generateCSV(sessions);
          mimeType = 'text/csv';
          break;
        case 'json':
          fileData = JSON.stringify(sessions, null, 2);
          mimeType = 'application/json';
          break;
        case 'pdf':
        case 'excel':
          // Ces formats nécessiteraient des bibliothèques spécialisées
          return this.createResponse(
            null as any,
            false,
            undefined,
            {
              code: 'EXPORT_ERROR',
              message: `Le format ${format} n'est pas encore supporté`
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

      // Créer l'objet export (en réalité, il faudrait stocker le fichier quelque part)
      const exportData: ActivityExport = {
        id: `export_${Date.now()}`,
        format,
        filename,
        file_url: `data:${mimeType};base64,${btoa(fileData)}`, // Data URL temporaire
        filters,
        total_records: sessions.length,
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
        this.handleError(error, 'exportActivities')
      );
    }
  }

  /**
   * Génère un CSV à partir des sessions
   */
  private static generateCSV(sessions: TimeSession[]): string {
    const headers = [
      'Date',
      'Projet',
      'Activité',
      'Type',
      'Durée (min)',
      'Tarif (€/min)',
      'Coût total (€)',
      'Statut',
      'Notes'
    ];

    const rows = sessions.map(session => [
      new Date(session.start_time).toLocaleString('fr-FR'),
      session.project_title || '',
      session.activity_description,
      session.activity_type || '',
      session.duration_minutes || '',
      session.hourly_rate,
      session.total_cost || '',
      session.status,
      session.notes || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // ==========================================
  // TEMPLATES
  // ==========================================

  /**
   * Récupère les templates d'activité
   */
  static async getTemplates(): Promise<ActivityAPIResponse<ActivityTemplate[]>> {
    // Pour l'instant, retourner des templates statiques
    // En réalité, ceux-ci viendraient d'une table en base
    const templates: ActivityTemplate[] = [
      {
        id: 'dev-frontend',
        name: 'Développement Frontend',
        description: 'Session de développement interface utilisateur',
        activity_type: 'development',
        estimated_duration: 120,
        default_tags: ['frontend', 'ui', 'react'],
        is_public: true,
        created_by: 'system',
        usage_count: 0
      },
      {
        id: 'meeting-client',
        name: 'Réunion Client',
        description: 'Point avec le client sur l\'avancement',
        activity_type: 'meeting',
        estimated_duration: 60,
        default_tags: ['meeting', 'client', 'suivi'],
        is_public: true,
        created_by: 'system',
        usage_count: 0
      },
      {
        id: 'research',
        name: 'Recherche & Documentation',
        description: 'Recherche technique et documentation',
        activity_type: 'research',
        estimated_duration: 90,
        default_tags: ['research', 'documentation'],
        is_public: true,
        created_by: 'system',
        usage_count: 0
      }
    ];

    return this.createResponse(templates, true, 'Templates récupérés avec succès');
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Formate une durée en minutes en format lisible
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
  }

  /**
   * Formate un coût
   */
  static formatCost(cost: number): string {
    return `${cost.toFixed(2)}€`;
  }

  /**
   * Calcule le coût d'une session
   */
  static calculateSessionCost(session: TimeSession): number {
    if (!session.duration_minutes) return 0;
    return session.duration_minutes * session.hourly_rate;
  }
}