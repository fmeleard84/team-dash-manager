/**
 * InvoicesAPI - Service API Centralisé pour la Gestion des Factures
 *
 * Service centralisé pour toutes les interactions avec la base de données Supabase
 * concernant les factures, paiements et exports comptables.
 *
 * Fonctionnalités principales :
 * - CRUD complet des factures et éléments
 * - Génération automatique depuis time tracking
 * - Intégration Stripe pour paiements
 * - Export PDF, comptable (XML, CSV)
 * - Gestion des templates et récurrence
 * - Real-time et synchronisation
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Invoice,
  InvoiceItem,
  InvoiceFilters,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  CreateCompanyInfoData,
  UpdateCompanyInfoData,
  CompanyInfo,
  InvoiceAPIResponse,
  InvoicePaginatedResponse,
  InvoiceStats,
  MonthlyRevenue,
  PaymentTrend,
  InvoiceTemplate,
  StripeSessionData,
  StripeWebhookPayload,
  InvoiceExport,
  AccountingExport,
  InvoiceFormat,
  InvoiceStatus,
  PaymentMethod,
  TimeRange,
  PaginatedResult
} from '../types';

export class InvoicesAPI {
  // ==========================================
  // CRUD FACTURES
  // ==========================================

  /**
   * Récupère la liste des factures avec filtres et pagination
   */
  static async getInvoices(
    filters: Partial<InvoiceFilters> = {}
  ): Promise<InvoiceAPIResponse<PaginatedResult<Invoice>>> {
    try {
      const {
        client_id,
        project_id,
        status = [],
        date_from,
        date_to,
        amount_min_cents,
        amount_max_cents,
        payment_method = [],
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_direction = 'desc'
      } = filters;

      let query = supabase
        .from('invoices')
        .select(`
          *,
          project:projects!project_id (
            id,
            title,
            description,
            status,
            owner_id
          ),
          items:invoice_items (
            *,
            candidate:profiles!candidate_id (
              id,
              first_name,
              last_name,
              email
            )
          ),
          payments:invoice_payments (
            id,
            amount_cents,
            payment_method,
            payment_date,
            status
          )
        `, { count: 'exact' });

      // Filtres de base
      if (client_id) {
        query = query.eq('client_id', client_id);
      }

      if (project_id) {
        query = query.eq('project_id', project_id);
      }

      // Filtres par statut
      if (status.length > 0) {
        query = query.in('status', status);
      }

      // Filtres par date
      if (date_from) {
        query = query.gte('issued_date', date_from);
      }

      if (date_to) {
        query = query.lte('issued_date', date_to);
      }

      // Filtres par montant
      if (amount_min_cents !== undefined) {
        query = query.gte('total_cents', amount_min_cents);
      }

      if (amount_max_cents !== undefined) {
        query = query.lte('total_cents', amount_max_cents);
      }

      // Filtre par méthode de paiement
      if (payment_method.length > 0) {
        query = query.in('payment_method', payment_method);
      }

      // Recherche textuelle
      if (search && search.trim()) {
        query = query.or(`
          invoice_number.ilike.%${search}%,
          notes.ilike.%${search}%
        `);
      }

      // Tri
      const ascending = sort_direction === 'asc';
      query = query.order(sort_by, { ascending });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = count ? Math.ceil(count / limit) : 0;

      return {
        success: true,
        data: {
          data: data || [],
          total_count: count || 0,
          page,
          limit,
          has_more: page < totalPages,
          total_pages: totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des factures'
      };
    }
  }

  /**
   * Récupère une facture par son ID
   */
  static async getInvoiceById(id: string): Promise<InvoiceAPIResponse<Invoice>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects!project_id (
            id,
            title,
            description,
            status,
            owner_id
          ),
          items:invoice_items (
            *,
            candidate:profiles!candidate_id (
              id,
              first_name,
              last_name,
              email
            )
          ),
          payments:invoice_payments (
            *
          ),
          client:profiles!client_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facture non trouvée'
      };
    }
  }

  /**
   * Crée une nouvelle facture
   */
  static async createInvoice(
    invoiceData: CreateInvoiceData
  ): Promise<InvoiceAPIResponse<Invoice>> {
    try {
      const {
        project_id,
        period_start,
        period_end,
        due_date,
        notes,
        invoice_type = 'regular',
        auto_generate_items = true
      } = invoiceData;

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber();

      // Date d'échéance par défaut (30 jours)
      const defaultDueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Créer la facture de base
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          project_id,
          period_start,
          period_end,
          status: 'draft',
          subtotal_cents: 0,
          vat_rate: 20, // 20% par défaut
          vat_amount_cents: 0,
          total_cents: 0,
          currency: 'EUR',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: defaultDueDate,
          notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Auto-générer les éléments de facture si demandé
      if (auto_generate_items) {
        await this.generateInvoiceItemsFromTimeTracking(
          invoice.id,
          project_id,
          period_start,
          period_end
        );
      }

      // Récupérer la facture complète
      return await this.getInvoiceById(invoice.id);
    } catch (error) {
      console.error('Error creating invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création de la facture'
      };
    }
  }

  /**
   * Met à jour une facture existante
   */
  static async updateInvoice(
    id: string,
    updates: UpdateInvoiceData
  ): Promise<InvoiceAPIResponse<Invoice>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la facture'
      };
    }
  }

  /**
   * Supprime une facture
   */
  static async deleteInvoice(id: string): Promise<InvoiceAPIResponse<boolean>> {
    try {
      // Vérifier que la facture peut être supprimée
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', id)
        .single();

      if (invoice?.status === 'paid') {
        throw new Error('Impossible de supprimer une facture payée');
      }

      // Supprimer les éléments de facture en premier
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      // Supprimer les paiements associés
      await supabase
        .from('invoice_payments')
        .delete()
        .eq('invoice_id', id);

      // Supprimer la facture
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression de la facture'
      };
    }
  }

  // ==========================================
  // GESTION DES ÉLÉMENTS DE FACTURE
  // ==========================================

  /**
   * Génère automatiquement les éléments de facture depuis le time tracking
   */
  static async generateInvoiceItemsFromTimeTracking(
    invoiceId: string,
    projectId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<InvoiceAPIResponse<InvoiceItem[]>> {
    try {
      // Récupérer les sessions de temps pour la période
      const { data: timeSessions, error: timeError } = await supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          candidate:profiles!candidate_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .gte('start_time', `${periodStart}T00:00:00`)
        .lte('start_time', `${periodEnd}T23:59:59`);

      if (timeError) throw timeError;

      if (!timeSessions || timeSessions.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Grouper par candidat
      const sessionsByCandidate = timeSessions.reduce((acc, session) => {
        const candidateId = session.candidate_id;
        if (!acc[candidateId]) {
          acc[candidateId] = {
            candidate: session.candidate,
            sessions: []
          };
        }
        acc[candidateId].sessions.push(session);
        return acc;
      }, {} as Record<string, any>);

      const invoiceItems: InvoiceItem[] = [];
      let totalAmount = 0;

      // Créer un élément par candidat
      for (const [candidateId, candidateData] of Object.entries(sessionsByCandidate)) {
        const sessions = candidateData.sessions;
        const candidate = candidateData.candidate;

        const totalMinutes = sessions.reduce((sum: number, session: any) =>
          sum + (session.duration_minutes || 0), 0
        );

        const ratePerMinuteCents = 75; // 45€/h = 0.75€/min = 75 centimes/min
        const amountCents = totalMinutes * ratePerMinuteCents;

        const taskDetails = sessions.map((session: any) => ({
          description: session.activity_description || 'Développement',
          duration_minutes: session.duration_minutes || 0,
          date: session.start_time.split('T')[0],
          start_time: session.start_time,
          end_time: session.end_time,
          time_tracking_id: session.id,
          activity_type: session.activity_type,
          tags: session.tags || []
        }));

        const serviceName = `${candidate.first_name} ${candidate.last_name} - Développement`;

        const { data: invoiceItem, error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoiceId,
            candidate_id: candidateId,
            service_name: serviceName,
            service_description: `Développement pour la période du ${periodStart} au ${periodEnd}`,
            total_minutes: totalMinutes,
            rate_per_minute_cents: ratePerMinuteCents,
            amount_cents: amountCents,
            task_details: taskDetails
          })
          .select()
          .single();

        if (itemError) throw itemError;

        invoiceItems.push(invoiceItem);
        totalAmount += amountCents;
      }

      // Mettre à jour les totaux de la facture
      const vatAmount = Math.round(totalAmount * 0.20);
      const totalWithVat = totalAmount + vatAmount;

      await supabase
        .from('invoices')
        .update({
          subtotal_cents: totalAmount,
          vat_amount_cents: vatAmount,
          total_cents: totalWithVat,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      return {
        success: true,
        data: invoiceItems
      };
    } catch (error) {
      console.error('Error generating invoice items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la génération des éléments de facture'
      };
    }
  }

  /**
   * Ajoute un élément à une facture
   */
  static async addInvoiceItem(
    itemData: CreateInvoiceItemData
  ): Promise<InvoiceAPIResponse<InvoiceItem>> {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(itemData)
        .select(`
          *,
          candidate:profiles!candidate_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      // Recalculer les totaux de la facture
      await this.recalculateInvoiceTotals(itemData.invoice_id);

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error adding invoice item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'élément'
      };
    }
  }

  // ==========================================
  // GESTION DES PAIEMENTS STRIPE
  // ==========================================

  /**
   * Crée une session de paiement Stripe
   */
  static async createStripeSession(
    invoiceId: string
  ): Promise<InvoiceAPIResponse<StripeSessionData>> {
    try {
      // Récupérer la facture
      const invoiceResponse = await this.getInvoiceById(invoiceId);
      if (!invoiceResponse.success || !invoiceResponse.data) {
        throw new Error('Facture non trouvée');
      }

      const invoice = invoiceResponse.data;

      // Appeler l'Edge Function pour créer la session Stripe
      const { data, error } = await supabase.functions.invoke('create-stripe-session', {
        body: {
          invoice_id: invoiceId,
          amount_cents: invoice.total_cents,
          currency: invoice.currency || 'EUR',
          description: `Facture ${invoice.invoice_number}`,
          metadata: {
            invoice_id: invoiceId,
            project_id: invoice.project_id,
            client_id: invoice.client_id
          }
        }
      });

      if (error) throw error;

      return {
        success: true,
        data: {
          session_id: data.session_id,
          payment_url: data.url,
          expires_at: data.expires_at
        }
      };
    } catch (error) {
      console.error('Error creating Stripe session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création de la session de paiement'
      };
    }
  }

  /**
   * Traite un webhook Stripe
   */
  static async processStripeWebhook(
    payload: StripeWebhookPayload
  ): Promise<InvoiceAPIResponse<boolean>> {
    try {
      const { type, data: eventData } = payload;

      if (type === 'checkout.session.completed') {
        const session = eventData.object;
        const invoiceId = session.metadata?.invoice_id;

        if (!invoiceId) {
          throw new Error('Invoice ID manquant dans les métadonnées');
        }

        // Marquer la facture comme payée
        await this.updateInvoice(invoiceId, {
          status: 'paid',
          payment_method: 'stripe',
          payment_date: new Date().toISOString()
        });

        // Enregistrer le paiement
        await supabase
          .from('invoice_payments')
          .insert({
            invoice_id: invoiceId,
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'EUR',
            payment_method: 'stripe',
            payment_date: new Date().toISOString(),
            status: 'succeeded',
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent
          });
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du traitement du webhook'
      };
    }
  }

  // ==========================================
  // STATISTIQUES ET RAPPORTS
  // ==========================================

  /**
   * Récupère les statistiques des factures
   */
  static async getInvoiceStats(
    clientId: string,
    timeRange: TimeRange = 'month'
  ): Promise<InvoiceAPIResponse<InvoiceStats>> {
    try {
      // Calculer la période selon le timeRange
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Récupérer toutes les factures pour le client
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId);

      if (!allInvoices) {
        throw new Error('Erreur lors de la récupération des factures');
      }

      // Calculer les statistiques
      const stats: InvoiceStats = {
        total_invoices: allInvoices.length,
        draft_invoices: allInvoices.filter(i => i.status === 'draft').length,
        sent_invoices: allInvoices.filter(i => i.status === 'sent').length,
        paid_invoices: allInvoices.filter(i => i.status === 'paid').length,
        overdue_invoices: allInvoices.filter(i => {
          const dueDate = new Date(i.due_date);
          return dueDate < now && i.status !== 'paid';
        }).length,
        total_revenue_cents: allInvoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + i.total_cents, 0),
        pending_revenue_cents: allInvoices
          .filter(i => i.status === 'sent')
          .reduce((sum, i) => sum + i.total_cents, 0),
        overdue_revenue_cents: allInvoices
          .filter(i => {
            const dueDate = new Date(i.due_date);
            return dueDate < now && i.status === 'sent';
          })
          .reduce((sum, i) => sum + i.total_cents, 0),
        average_invoice_cents: allInvoices.length > 0
          ? Math.round(allInvoices.reduce((sum, i) => sum + i.total_cents, 0) / allInvoices.length)
          : 0,
        average_payment_days: 0, // TODO: calculer depuis les paiements
        total_vat_cents: allInvoices.reduce((sum, i) => sum + (i.vat_amount_cents || 0), 0),
        this_month_revenue_cents: allInvoices
          .filter(i => {
            const invoiceDate = new Date(i.issued_date);
            return invoiceDate.getMonth() === now.getMonth() &&
                   invoiceDate.getFullYear() === now.getFullYear() &&
                   i.status === 'paid';
          })
          .reduce((sum, i) => sum + i.total_cents, 0),
        this_quarter_revenue_cents: 0, // TODO: implémenter
        this_year_revenue_cents: allInvoices
          .filter(i => {
            const invoiceDate = new Date(i.issued_date);
            return invoiceDate.getFullYear() === now.getFullYear() && i.status === 'paid';
          })
          .reduce((sum, i) => sum + i.total_cents, 0),
        payment_method_distribution: allInvoices
          .filter(i => i.payment_method)
          .reduce((acc, i) => {
            const method = i.payment_method as PaymentMethod;
            acc[method] = (acc[method] || 0) + 1;
            return acc;
          }, {} as Record<PaymentMethod, number>),
        status_distribution: allInvoices
          .reduce((acc, i) => {
            const status = i.status as InvoiceStatus;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<InvoiceStatus, number>),
        monthly_revenue: [] // TODO: calculer les revenus mensuels
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du calcul des statistiques'
      };
    }
  }

  // ==========================================
  // EXPORT ET GÉNÉRATION DE DOCUMENTS
  // ==========================================

  /**
   * Exporte une facture au format demandé
   */
  static async exportInvoice(
    invoiceId: string,
    format: InvoiceFormat
  ): Promise<InvoiceAPIResponse<string>> {
    try {
      const { data, error } = await supabase.functions.invoke('export-invoice', {
        body: {
          invoice_id: invoiceId,
          format
        }
      });

      if (error) throw error;

      return {
        success: true,
        data: data.file_url || data.content
      };
    } catch (error) {
      console.error('Error exporting invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'export de la facture'
      };
    }
  }

  // ==========================================
  // GESTION DE L'ENTREPRISE
  // ==========================================

  /**
   * Récupère les informations de l'entreprise
   */
  static async getCompanyInfo(): Promise<InvoiceAPIResponse<CompanyInfo>> {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching company info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des informations entreprise'
      };
    }
  }

  /**
   * Met à jour les informations de l'entreprise
   */
  static async updateCompanyInfo(
    updates: UpdateCompanyInfoData
  ): Promise<InvoiceAPIResponse<CompanyInfo>> {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .upsert({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating company info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour des informations'
      };
    }
  }

  // ==========================================
  // UTILITAIRES PRIVÉS
  // ==========================================

  /**
   * Génère un numéro de facture unique
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    const nextNumber = (count || 0) + 1;
    return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Recalcule les totaux d'une facture
   */
  private static async recalculateInvoiceTotals(invoiceId: string): Promise<void> {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('amount_cents')
      .eq('invoice_id', invoiceId);

    if (items) {
      const subtotalCents = items.reduce((sum, item) => sum + item.amount_cents, 0);
      const vatAmountCents = Math.round(subtotalCents * 0.20);
      const totalCents = subtotalCents + vatAmountCents;

      await supabase
        .from('invoices')
        .update({
          subtotal_cents: subtotalCents,
          vat_amount_cents: vatAmountCents,
          total_cents: totalCents,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    }
  }

  /**
   * Abonnement aux changements temps réel
   */
  static subscribeToInvoices(
    clientId: string,
    onInvoiceChange: (invoice: Invoice) => void,
    onInvoiceDelete: (invoiceId: string) => void
  ) {
    return supabase
      .channel('invoices-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'invoices',
        filter: `client_id=eq.${clientId}`
      }, payload => {
        onInvoiceChange(payload.new as Invoice);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'invoices',
        filter: `client_id=eq.${clientId}`
      }, payload => {
        onInvoiceChange(payload.new as Invoice);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'invoices'
      }, payload => {
        onInvoiceDelete(payload.old.id);
      })
      .subscribe();
  }
}