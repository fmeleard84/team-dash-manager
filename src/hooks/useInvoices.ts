import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal_cents: number;
  vat_rate: number;
  vat_amount_cents: number;
  total_cents: number;
  payment_method?: string;
  payment_date?: string;
  stripe_payment_intent_id?: string;
  issued_date: string;
  due_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  project?: {
    id: string;
    title: string;
    description?: string;
  };
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  candidate_id: string;
  service_name: string;
  service_description?: string;
  total_minutes: number;
  rate_per_minute_cents: number;
  amount_cents: number;
  task_details: TaskDetail[];
  // Relations
  candidate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface TaskDetail {
  description: string;
  duration_minutes: number;
  date: string;
  time_tracking_id: string;
}

export interface CompanyInfo {
  id: string;
  company_name: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  siret?: string;
  vat_number?: string;
  logo_url?: string;
}

export const useInvoices = (projectId?: string) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Load invoices
  const loadInvoices = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          project:projects!project_id (
            id,
            title,
            description
          ),
          items:invoice_items (
            *,
            candidate:profiles!candidate_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by project if specified
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Invoices loaded:', data?.length);
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  // Load projects for invoice generation
  const loadProjects = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading projects for user:', user.id, 'with role:', user.role);
      
      // Only load projects where the current user is the owner (client)
      // This ensures we only show projects that belong to this specific client
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, owner_id')
        .eq('owner_id', user.id)  // Only projects owned by this client
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Projects loaded for invoicing (${data?.length || 0} projects):`, data?.map(p => ({
        title: p.title,
        status: p.status,
        owner_id: p.owner_id
      })));
      
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Load company info
  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  // Generate invoice for a specific week
  const generateWeeklyInvoice = async (
    projectId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<string | null> => {
    try {
      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (!project) throw new Error('Projet non trouvé');
      
      // Get tracking records for the period
      // TEMPORAIRE: On récupère TOUS les enregistrements sans filtre de date pour test
      const { data: trackingRecords } = await supabase
        .from('active_time_tracking')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'completed');
        // PRODUCTION: Décommenter ces lignes pour filtrer par période
        // .gte('start_time', weekStart.toISOString())
        // .lte('start_time', weekEnd.toISOString());
      
      if (!trackingRecords || trackingRecords.length === 0) {
        toast.error('Aucun enregistrement de temps trouvé pour cette période');
        return null;
      }
      
      // Group records by candidate
      const recordsByCandidates = trackingRecords.reduce((acc: any, record) => {
        if (!acc[record.candidate_id]) {
          acc[record.candidate_id] = [];
        }
        acc[record.candidate_id].push(record);
        return acc;
      }, {});
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          client_id: project.owner_id || project.user_id,
          period_start: weekStart.toISOString().split('T')[0],
          period_end: weekEnd.toISOString().split('T')[0],
          status: 'draft',
          subtotal_cents: 0,
          vat_amount_cents: 0,
          total_cents: 0
        })
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      let totalAmount = 0;
      
      // Create invoice items for each candidate
      for (const [candidateId, records] of Object.entries(recordsByCandidates)) {
        const candidateRecords = records as any[];
        const totalMinutes = candidateRecords.reduce((sum, r) => sum + (r.duration_minutes || 60), 0);
        const hourlyRate = 0.75; // 45€/hour = 0.75€/min
        const amountCents = Math.round(totalMinutes * hourlyRate * 100);
        
        // Get candidate info
        const { data: candidateProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', candidateId)
          .single();
        
        const serviceName = candidateProfile 
          ? `${candidateProfile.first_name} ${candidateProfile.last_name} - Développement`
          : 'Développement';
        
        // Create invoice item
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            candidate_id: candidateId,
            service_name: serviceName,
            total_minutes: totalMinutes,
            rate_per_minute_cents: Math.round(hourlyRate * 100),
            amount_cents: amountCents,
            task_details: candidateRecords.map(r => ({
              description: r.activity_description || 'Développement',
              duration_minutes: r.duration_minutes || 60,
              date: new Date(r.start_time).toISOString().split('T')[0]
            }))
          });
        
        totalAmount += amountCents;
      }
      
      // Update invoice totals
      const vatAmount = Math.round(totalAmount * 0.20);
      const total = totalAmount + vatAmount;
      
      await supabase
        .from('invoices')
        .update({
          subtotal_cents: totalAmount,
          vat_amount_cents: vatAmount,
          total_cents: total
        })
        .eq('id', invoice.id);

      toast.success('Facture générée avec succès');
      await loadInvoices(); // Reload invoices
      return invoice.id;
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Erreur lors de la génération de la facture');
      return null;
    }
  };

  // Mark invoice as paid
  const markInvoiceAsPaid = async (
    invoiceId: string,
    paymentMethod: string = 'stripe'
  ) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast.success('Facture marquée comme payée');
      await loadInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Erreur lors de la mise à jour de la facture');
    }
  };

  // Get invoice by ID
  const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects!project_id (
            id,
            title,
            description
          ),
          items:invoice_items (
            *,
            candidate:profiles!candidate_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error loading invoice:', error);
      return null;
    }
  };

  // Helper functions
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  };

  const getInvoiceStatus = (invoice: Invoice): {
    label: string;
    color: string;
  } => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    
    if (invoice.status === 'paid') {
      return { label: 'Payée', color: 'bg-green-100 text-green-800' };
    } else if (invoice.status === 'cancelled') {
      return { label: 'Annulée', color: 'bg-gray-100 text-gray-800' };
    } else if (invoice.status === 'draft') {
      return { label: 'Brouillon', color: 'bg-yellow-100 text-yellow-800' };
    } else if (today > dueDate && invoice.status === 'sent') {
      return { label: 'En retard', color: 'bg-red-100 text-red-800' };
    } else {
      return { label: 'En attente', color: 'bg-blue-100 text-blue-800' };
    }
  };

  // Calculate weekly periods for the last 4 weeks
  const getWeeklyPeriods = () => {
    const periods = [];
    const today = new Date();
    
    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (today.getDay() || 7) - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      
      periods.push({
        start: weekStart,
        end: weekEnd,
        label: `Semaine du ${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}`
      });
    }
    
    return periods;
  };

  useEffect(() => {
    loadInvoices();
    loadCompanyInfo();
    loadProjects();
  }, [user?.id, projectId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `client_id=eq.${user.id}`
        },
        () => {
          loadInvoices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    invoices,
    projects,
    loading,
    companyInfo,
    generateWeeklyInvoice,
    markInvoiceAsPaid,
    getInvoiceById,
    formatCurrency,
    formatMinutesToHours,
    getInvoiceStatus,
    getWeeklyPeriods,
    refresh: loadInvoices
  };
};