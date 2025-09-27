import { supabase } from '@/integrations/supabase/client';
import {
  Payment,
  TimeRecord,
  Invoice,
  PaymentStats,
  PaymentFilters,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentCalculation,
  PaymentExport,
  TaxReport,
  PaymentSettings,
  PaymentAPIResponse,
  PaymentPaginatedResponse,
  PaymentError,
  PaymentExportFormat,
  PaymentStatus,
  PaymentMethod,
  TopClient,
  ProjectEarnings,
  MonthlyEarnings,
  InvoiceFilters
} from '../types';

export class PaymentsAPI {
  // ====== GESTION DES PAIEMENTS ======

  /**
   * Récupère les paiements du candidat avec filtres
   */
  static async getPayments(
    candidateId: string,
    filters?: PaymentFilters
  ): Promise<PaymentPaginatedResponse<Payment>> {
    try {
      let query = supabase
        .from('invoice_payments')
        .select(`
          *,
          projects (
            id,
            title,
            description,
            status,
            owner_id
          ),
          profiles:client_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('candidate_id', candidateId);

      // Appliquer les filtres
      if (filters?.status?.length) {
        // Map des statuts vers les statuts de base de données
        const dbStatuses = filters.status.map(status => {
          switch (status) {
            case 'paid': return 'paid';
            case 'pending': return 'pending';
            case 'processing': return 'processing';
            case 'failed': return 'failed';
            default: return status;
          }
        });
        query = query.in('status', dbStatuses);
      }

      if (filters?.date_range) {
        query = query
          .gte('payment_date', filters.date_range.start)
          .lte('payment_date', filters.date_range.end);
      }

      if (filters?.project_ids?.length) {
        query = query.in('project_id', filters.project_ids);
      }

      if (filters?.client_ids?.length) {
        query = query.in('client_id', filters.client_ids);
      }

      if (filters?.amount_range) {
        query = query
          .gte('total_cents', filters.amount_range.min_cents)
          .lte('total_cents', filters.amount_range.max_cents);
      }

      if (filters?.search_query) {
        // Recherche dans les projets et descriptions
        query = query.or(`
          projects.title.ilike.%${filters.search_query}%,
          notes.ilike.%${filters.search_query}%
        `);
      }

      // Tri
      const sortBy = filters?.sort_by || 'payment_date';
      const sortOrder = filters?.sort_order || 'desc';

      switch (sortBy) {
        case 'amount':
          query = query.order('total_cents', { ascending: sortOrder === 'asc' });
          break;
        case 'client_name':
          query = query.order('profiles(first_name)', { ascending: sortOrder === 'asc' });
          break;
        case 'project_title':
          query = query.order('projects(title)', { ascending: sortOrder === 'asc' });
          break;
        default:
          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Pagination
      const page = filters?.page || 1;
      const perPage = filters?.per_page || 20;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // Enrichir les données
      const enrichedPayments: Payment[] = (data || []).map(payment => ({
        id: payment.id,
        project_id: payment.project_id,
        candidate_id: candidateId,
        client_id: payment.client_id,
        period_start: payment.period_start,
        period_end: payment.period_end,
        amount_cents: payment.total_cents,
        hourly_rate_cents: 4500, // 45€/hour par défaut
        total_minutes_worked: payment.total_minutes || 0,
        payment_status: this.mapPaymentStatus(payment.status),
        payment_method: payment.payment_method || 'stripe',
        payment_date: payment.payment_date,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        project: payment.projects ? {
          id: payment.projects.id,
          title: payment.projects.title,
          description: payment.projects.description,
          status: payment.projects.status || 'active',
          client_id: payment.projects.owner_id,
          team_size: 1
        } : undefined,
        client: payment.profiles ? {
          id: payment.profiles.id,
          company_name: '',
          first_name: payment.profiles.first_name || '',
          last_name: payment.profiles.last_name || '',
          email: payment.profiles.email || '',
          payment_terms_days: 30
        } : undefined
      }));

      return {
        data: enrichedPayments,
        success: true,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: Math.ceil((count || 0) / perPage),
          total_count: count || 0,
          has_previous: page > 1,
          has_next: (page * perPage) < (count || 0)
        }
      };
    } catch (error) {
      console.error('PaymentsAPI.getPayments:', error);
      return {
        data: [],
        success: false,
        error: {
          code: 'FETCH_PAYMENTS_ERROR',
          message: 'Impossible de récupérer les paiements'
        },
        pagination: {
          current_page: 1,
          per_page: 20,
          total_pages: 0,
          total_count: 0,
          has_previous: false,
          has_next: false
        }
      };
    }
  }

  /**
   * Récupère un paiement spécifique
   */
  static async getPayment(paymentId: string): Promise<PaymentAPIResponse<Payment>> {
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select(`
          *,
          projects (
            id,
            title,
            description,
            status,
            owner_id
          ),
          profiles:client_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      const enrichedPayment: Payment = {
        id: data.id,
        project_id: data.project_id,
        candidate_id: data.candidate_id || '',
        client_id: data.client_id,
        period_start: data.period_start,
        period_end: data.period_end,
        amount_cents: data.total_cents,
        hourly_rate_cents: 4500,
        total_minutes_worked: data.total_minutes || 0,
        payment_status: this.mapPaymentStatus(data.status),
        payment_method: data.payment_method || 'stripe',
        payment_date: data.payment_date,
        stripe_payment_intent_id: data.stripe_payment_intent_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        project: data.projects ? {
          id: data.projects.id,
          title: data.projects.title,
          description: data.projects.description,
          status: data.projects.status || 'active',
          client_id: data.projects.owner_id,
          team_size: 1
        } : undefined,
        client: data.profiles ? {
          id: data.profiles.id,
          company_name: '',
          first_name: data.profiles.first_name || '',
          last_name: data.profiles.last_name || '',
          email: data.profiles.email || '',
          payment_terms_days: 30
        } : undefined
      };

      return {
        data: enrichedPayment,
        success: true
      };
    } catch (error) {
      console.error('PaymentsAPI.getPayment:', error);
      return {
        data: {} as Payment,
        success: false,
        error: {
          code: 'FETCH_PAYMENT_ERROR',
          message: 'Impossible de récupérer le paiement'
        }
      };
    }
  }

  /**
   * Crée une demande de paiement
   */
  static async createPayment(data: CreatePaymentData): Promise<PaymentAPIResponse<Payment>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer les enregistrements de temps
      const { data: timeRecords } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .in('id', data.time_record_ids)
        .eq('candidate_id', user.id);

      if (!timeRecords?.length) {
        throw new Error('Aucun enregistrement de temps trouvé');
      }

      // Calculer les totaux
      const totalMinutes = timeRecords.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
      const hourlyRateCents = 4500; // 45€/hour
      const minuteRateCents = hourlyRateCents / 60;
      const totalCents = Math.round(totalMinutes * minuteRateCents);

      // Récupérer les infos du projet et client
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', data.project_id)
        .single();

      if (!project) throw new Error('Projet non trouvé');

      // Créer le paiement
      const { data: payment, error } = await supabase
        .from('invoice_payments')
        .insert({
          project_id: data.project_id,
          client_id: project.owner_id,
          candidate_id: user.id,
          period_start: data.period_start,
          period_end: data.period_end,
          total_cents: totalCents,
          total_minutes: totalMinutes,
          status: 'pending',
          notes: data.notes
        })
        .select()
        .single();

      if (error) throw error;

      return await this.getPayment(payment.id);
    } catch (error) {
      console.error('PaymentsAPI.createPayment:', error);
      return {
        data: {} as Payment,
        success: false,
        error: {
          code: 'CREATE_PAYMENT_ERROR',
          message: error instanceof Error ? error.message : 'Impossible de créer le paiement'
        }
      };
    }
  }

  /**
   * Met à jour un paiement
   */
  static async updatePayment(
    paymentId: string,
    updateData: UpdatePaymentData
  ): Promise<PaymentAPIResponse<Payment>> {
    try {
      const { error } = await supabase
        .from('invoice_payments')
        .update({
          status: updateData.payment_status,
          payment_method: updateData.payment_method,
          payment_date: updateData.payment_date,
          notes: updateData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      return await this.getPayment(paymentId);
    } catch (error) {
      console.error('PaymentsAPI.updatePayment:', error);
      return {
        data: {} as Payment,
        success: false,
        error: {
          code: 'UPDATE_PAYMENT_ERROR',
          message: 'Impossible de mettre à jour le paiement'
        }
      };
    }
  }

  // ====== TIME TRACKING ======

  /**
   * Récupère les enregistrements de temps du candidat
   */
  static async getTimeRecords(
    candidateId: string,
    projectId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaymentAPIResponse<TimeRecord[]>> {
    try {
      let query = supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            id,
            title,
            owner_id
          )
        `)
        .eq('candidate_id', candidateId)
        .order('start_time', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const enrichedRecords: TimeRecord[] = (data || []).map(record => ({
        id: record.id,
        project_id: record.project_id,
        candidate_id: record.candidate_id,
        start_time: record.start_time,
        end_time: record.end_time,
        duration_minutes: record.duration_minutes || 0,
        activity_description: record.activity_description || 'Développement',
        task_category: this.mapTaskCategory(record.activity_description),
        hourly_rate_cents: 4500,
        amount_cents: Math.round((record.duration_minutes || 0) * 75), // 45€/hour = 0.75€/min
        status: record.status || 'completed',
        created_at: record.created_at,
        updated_at: record.updated_at
      }));

      return {
        data: enrichedRecords,
        success: true
      };
    } catch (error) {
      console.error('PaymentsAPI.getTimeRecords:', error);
      return {
        data: [],
        success: false,
        error: {
          code: 'FETCH_TIME_RECORDS_ERROR',
          message: 'Impossible de récupérer les enregistrements de temps'
        }
      };
    }
  }

  // ====== STATISTIQUES ======

  /**
   * Récupère les statistiques de paiement du candidat
   */
  static async getPaymentStats(candidateId: string): Promise<PaymentAPIResponse<PaymentStats>> {
    try {
      // Récupérer tous les paiements
      const paymentsResponse = await this.getPayments(candidateId);
      if (!paymentsResponse.success) throw new Error('Erreur lors de la récupération des paiements');

      const payments = paymentsResponse.data;
      const timeRecordsResponse = await this.getTimeRecords(candidateId);
      const timeRecords = timeRecordsResponse.success ? timeRecordsResponse.data : [];

      // Calculer les statistiques de base
      const totalEarningsCents = payments.reduce((sum, p) => sum + p.amount_cents, 0);
      const totalHoursWorked = timeRecords.reduce((sum, r) => sum + r.duration_minutes, 0) / 60;
      const totalProjects = new Set(payments.map(p => p.project_id)).size;
      const averageHourlyRateCents = totalHoursWorked > 0 ? Math.round(totalEarningsCents / totalHoursWorked) : 4500;
      const totalPaymentsReceived = payments.filter(p => p.payment_status === 'paid').length;
      const pendingPaymentsCents = payments
        .filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + p.amount_cents, 0);

      // Calculer les gains mensuels
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthEarningsCents = payments
        .filter(p => {
          const paymentDate = new Date(p.payment_date || p.created_at);
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const lastMonthEarningsCents = payments
        .filter(p => {
          const paymentDate = new Date(p.payment_date || p.created_at);
          return paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear;
        })
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const growthPercentage = lastMonthEarningsCents > 0
        ? ((currentMonthEarningsCents - lastMonthEarningsCents) / lastMonthEarningsCents) * 100
        : 0;

      // Top clients
      const clientsMap = new Map<string, TopClient>();
      payments.forEach(payment => {
        if (payment.client) {
          const clientId = payment.client.id;
          const existing = clientsMap.get(clientId) || {
            client_id: clientId,
            client_name: `${payment.client.first_name} ${payment.client.last_name}`,
            total_earnings_cents: 0,
            total_hours: 0,
            projects_count: 0,
            last_payment_date: undefined
          };

          existing.total_earnings_cents += payment.amount_cents;
          existing.total_hours += payment.total_minutes_worked / 60;
          existing.projects_count = new Set([...new Set(), payment.project_id]).size;

          if (payment.payment_date && (!existing.last_payment_date || payment.payment_date > existing.last_payment_date)) {
            existing.last_payment_date = payment.payment_date;
          }

          clientsMap.set(clientId, existing);
        }
      });

      const topClients = Array.from(clientsMap.values())
        .sort((a, b) => b.total_earnings_cents - a.total_earnings_cents)
        .slice(0, 5);

      // Gains par mois (derniers 12 mois)
      const earningsByMonth: MonthlyEarnings[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.payment_date || p.created_at);
          return paymentDate.getMonth() === date.getMonth() &&
                 paymentDate.getFullYear() === date.getFullYear();
        });

        earningsByMonth.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          earnings_cents: monthPayments.reduce((sum, p) => sum + p.amount_cents, 0),
          hours_worked: monthPayments.reduce((sum, p) => sum + p.total_minutes_worked, 0) / 60,
          payments_count: monthPayments.length,
          projects_count: new Set(monthPayments.map(p => p.project_id)).size
        });
      }

      // Gains par projet
      const projectsMap = new Map<string, ProjectEarnings>();
      payments.forEach(payment => {
        if (payment.project) {
          const projectId = payment.project.id;
          const existing = projectsMap.get(projectId) || {
            project_id: projectId,
            project_title: payment.project.title,
            client_name: payment.client ? `${payment.client.first_name} ${payment.client.last_name}` : 'Client',
            total_earnings_cents: 0,
            total_hours: 0,
            hourly_rate_cents: 4500,
            start_date: payment.period_start,
            end_date: undefined,
            status: payment.project.status
          };

          existing.total_earnings_cents += payment.amount_cents;
          existing.total_hours += payment.total_minutes_worked / 60;

          if (payment.period_end && (!existing.end_date || payment.period_end > existing.end_date)) {
            existing.end_date = payment.period_end;
          }

          projectsMap.set(projectId, existing);
        }
      });

      const earningsByProject = Array.from(projectsMap.values())
        .sort((a, b) => b.total_earnings_cents - a.total_earnings_cents);

      // Répartition par méthode de paiement
      const methodsMap = new Map<PaymentMethod, number>();
      payments.forEach(payment => {
        const method = payment.payment_method || 'stripe';
        methodsMap.set(method, (methodsMap.get(method) || 0) + payment.amount_cents);
      });

      const paymentMethodsBreakdown = Array.from(methodsMap.entries()).map(([method, total]) => ({
        method,
        count: payments.filter(p => (p.payment_method || 'stripe') === method).length,
        total_cents: total,
        percentage: totalEarningsCents > 0 ? (total / totalEarningsCents) * 100 : 0
      }));

      const stats: PaymentStats = {
        total_earnings_cents: totalEarningsCents,
        total_hours_worked: totalHoursWorked,
        total_projects: totalProjects,
        average_hourly_rate_cents: averageHourlyRateCents,
        total_payments_received: totalPaymentsReceived,
        pending_payments_cents: pendingPaymentsCents,
        current_month_earnings_cents: currentMonthEarningsCents,
        last_month_earnings_cents: lastMonthEarningsCents,
        growth_percentage: growthPercentage,
        top_clients: topClients,
        earnings_by_month: earningsByMonth,
        earnings_by_project: earningsByProject,
        payment_methods_breakdown: paymentMethodsBreakdown,
        tax_summary: {
          total_gross_cents: totalEarningsCents,
          total_tax_cents: Math.round(totalEarningsCents * 0.2), // 20% TVA par défaut
          total_net_cents: Math.round(totalEarningsCents * 0.8),
          tax_rate_average: 20,
          by_quarter: []
        }
      };

      return {
        data: stats,
        success: true
      };
    } catch (error) {
      console.error('PaymentsAPI.getPaymentStats:', error);
      return {
        data: {} as PaymentStats,
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Impossible de récupérer les statistiques'
        }
      };
    }
  }

  // ====== CALCULS ======

  /**
   * Calcule le montant d'un paiement basé sur les enregistrements de temps
   */
  static async calculatePayment(timeRecordIds: string[]): Promise<PaymentAPIResponse<PaymentCalculation>> {
    try {
      const { data: timeRecords, error } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .in('id', timeRecordIds);

      if (error) throw error;

      if (!timeRecords?.length) {
        throw new Error('Aucun enregistrement de temps trouvé');
      }

      const totalMinutes = timeRecords.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
      const hourlyRateCents = 4500; // 45€/hour
      const minuteRateCents = hourlyRateCents / 60;
      const subtotalCents = Math.round(totalMinutes * minuteRateCents);
      const taxCents = Math.round(subtotalCents * 0.2); // 20% TVA
      const totalCents = subtotalCents + taxCents;

      // Répartition par catégorie
      const categoryMap = new Map<string, { minutes: number; amount_cents: number }>();
      timeRecords.forEach(record => {
        const category = this.mapTaskCategory(record.activity_description);
        const existing = categoryMap.get(category) || { minutes: 0, amount_cents: 0 };
        existing.minutes += record.duration_minutes || 0;
        existing.amount_cents += Math.round((record.duration_minutes || 0) * minuteRateCents);
        categoryMap.set(category, existing);
      });

      const breakdownByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: category as any,
        minutes: data.minutes,
        amount_cents: data.amount_cents,
        percentage: totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0
      }));

      const calculation: PaymentCalculation = {
        total_minutes: totalMinutes,
        hourly_rate_cents: hourlyRateCents,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        breakdown_by_category: breakdownByCategory
      };

      return {
        data: calculation,
        success: true
      };
    } catch (error) {
      console.error('PaymentsAPI.calculatePayment:', error);
      return {
        data: {} as PaymentCalculation,
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Impossible de calculer le paiement'
        }
      };
    }
  }

  // ====== EXPORT ======

  /**
   * Exporte les paiements
   */
  static async exportPayments(
    candidateId: string,
    filters: PaymentFilters,
    format: PaymentExportFormat
  ): Promise<PaymentAPIResponse<PaymentExport>> {
    try {
      const paymentsResponse = await this.getPayments(candidateId, filters);
      if (!paymentsResponse.success) throw new Error('Erreur lors de la récupération des paiements');

      const exportData: PaymentExport = {
        id: `export_${Date.now()}`,
        format,
        filters,
        period: {
          start: filters.date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: filters.date_range?.end || new Date().toISOString().split('T')[0]
        },
        include_time_records: true,
        include_invoices: true,
        include_tax_info: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
        status: 'processing'
      };

      // Simuler la génération du fichier
      setTimeout(() => {
        exportData.status = 'completed';
        exportData.download_url = `/exports/${exportData.id}.${format}`;
        exportData.file_size_bytes = Math.floor(Math.random() * 1000000) + 10000;
      }, 2000);

      return {
        data: exportData,
        success: true
      };
    } catch (error) {
      console.error('PaymentsAPI.exportPayments:', error);
      return {
        data: {} as PaymentExport,
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Impossible d\'exporter les paiements'
        }
      };
    }
  }

  // ====== UTILITAIRES PRIVÉS ======

  private static mapPaymentStatus(dbStatus: string): PaymentStatus {
    switch (dbStatus) {
      case 'pending': return 'pending';
      case 'validated': return 'validated';
      case 'processing': return 'processing';
      case 'paid': return 'paid';
      case 'failed': return 'failed';
      case 'disputed': return 'disputed';
      case 'refunded': return 'refunded';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }

  private static mapTaskCategory(description?: string): string {
    if (!description) return 'development';

    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('design') || lowerDesc.includes('ui') || lowerDesc.includes('ux')) {
      return 'design';
    }
    if (lowerDesc.includes('test') || lowerDesc.includes('bug')) {
      return 'testing';
    }
    if (lowerDesc.includes('meeting') || lowerDesc.includes('réunion')) {
      return 'meeting';
    }
    if (lowerDesc.includes('doc') || lowerDesc.includes('documentation')) {
      return 'documentation';
    }
    if (lowerDesc.includes('management') || lowerDesc.includes('gestion')) {
      return 'management';
    }
    if (lowerDesc.includes('research') || lowerDesc.includes('recherche')) {
      return 'research';
    }
    if (lowerDesc.includes('support') || lowerDesc.includes('aide')) {
      return 'support';
    }

    return 'development';
  }

  /**
   * Formate une somme en centimes en euros
   */
  static formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  }

  /**
   * Formate les minutes en heures/minutes
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  }
}