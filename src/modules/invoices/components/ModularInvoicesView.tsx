/**
 * ModularInvoicesView - Interface Principale du Module Factures
 *
 * Composant principal offrant une interface complète pour la gestion des factures :
 * - Onglets : Vue d'ensemble, Factures, Statistiques, Templates
 * - Génération automatique depuis time tracking
 * - Paiements Stripe intégrés
 * - Export PDF et comptable
 * - Gestion des templates et récurrence
 * - Statistiques et analytics avancées
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/ui/components/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Badge } from '@/ui/components/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import {
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  CreditCard,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  Calendar,
  Euro,
  Clock,
  BarChart3,
  Receipt,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Printer,
  Settings,
  Template,
  Zap
} from 'lucide-react';

// Hooks du module
import {
  useInvoices,
  useInvoiceActions,
  useInvoiceStats,
  useInvoiceTemplates
} from '../hooks';

// Types du module
import type {
  ModularInvoicesViewProps,
  Invoice,
  InvoiceFilters,
  CreateInvoiceData,
  InvoiceStatus,
  InvoiceFormat
} from '../types';

export const ModularInvoicesView: React.FC<ModularInvoicesViewProps> = ({
  clientId,
  showOverview = true,
  showStats = true,
  showTemplates = true,
  showExportOptions = true,
  showStripeIntegration = true,
  initialFilters = {},
  className = '',
  onInvoiceClick,
  onPaymentSuccess
}) => {
  // ==========================================
  // HOOKS ET ÉTAT
  // ==========================================

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  // Hooks spécialisés du module
  const {
    invoices,
    projects,
    totalCount,
    loading,
    error,
    hasMore,
    filters,
    quickStats,
    refresh,
    loadMore,
    updateFilters,
    resetFilters,
    generateInvoiceForPeriod,
    formatCurrency,
    formatMinutesToHours,
    getInvoiceStatusInfo
  } = useInvoices(initialFilters, {
    enableRealtime: true,
    autoLoadProjects: true
  });

  const {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    sendInvoice,
    markAsPaid,
    cancelInvoice,
    createStripeSession,
    exportInvoice,
    printInvoice,
    loading: actionLoading,
    error: actionError
  } = useInvoiceActions();

  const {
    stats,
    monthlyRevenue,
    chartData,
    revenueGrowth,
    averageInvoiceValue,
    paymentEfficiency,
    overdueRate,
    refresh: refreshStats
  } = useInvoiceStats({
    timeRange: 'month',
    includeTrends: true,
    includeClientStats: true
  });

  const {
    templates,
    defaultTemplate,
    createTemplate,
    generateInvoiceFromTemplate,
    loading: templatesLoading
  } = useInvoiceTemplates();

  // ==========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ==========================================

  const handleInvoiceClick = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    onInvoiceClick?.(invoice);
  }, [onInvoiceClick]);

  const handleCreateInvoice = useCallback(async (data: CreateInvoiceData) => {
    const newInvoice = await createInvoice(data);
    if (newInvoice) {
      setIsCreating(false);
      refresh();
    }
  }, [createInvoice, refresh]);

  const handleQuickAction = useCallback(async (action: string, invoiceId: string) => {
    switch (action) {
      case 'send':
        await sendInvoice(invoiceId);
        break;
      case 'mark_paid':
        await markAsPaid(invoiceId, 'stripe');
        break;
      case 'cancel':
        if (confirm('Êtes-vous sûr de vouloir annuler cette facture ?')) {
          await cancelInvoice(invoiceId);
        }
        break;
      case 'duplicate':
        await duplicateInvoice(invoiceId);
        break;
      case 'print':
        await printInvoice(invoiceId);
        break;
      case 'delete':
        if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
          await deleteInvoice(invoiceId);
        }
        break;
      default:
        return;
    }
    refresh();
  }, [sendInvoice, markAsPaid, cancelInvoice, duplicateInvoice, printInvoice, deleteInvoice, refresh]);

  const handlePayInvoice = useCallback(async (invoice: Invoice) => {
    if (!showStripeIntegration) return;

    try {
      const sessionData = await createStripeSession(invoice.id);
      if (sessionData) {
        // Rediriger vers Stripe Checkout
        window.location.href = sessionData.payment_url;
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
    }
  }, [showStripeIntegration, createStripeSession]);

  const handleExport = useCallback(async (format: InvoiceFormat, invoiceId?: string) => {
    if (invoiceId) {
      // Export d'une facture spécifique
      const exported = await exportInvoice(invoiceId, format);
      if (exported) {
        window.open(exported, '_blank');
      }
    } else {
      // Export global (à implémenter)
      console.log('Export global en', format);
    }
  }, [exportInvoice]);

  // ==========================================
  // DONNÉES FILTRÉES
  // ==========================================

  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.project?.title?.toLowerCase().includes(query) ||
        invoice.notes?.toLowerCase().includes(query)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    return filtered;
  }, [invoices, searchQuery, statusFilter]);

  // ==========================================
  // RENDU DES ONGLETS
  // ==========================================

  const renderOverviewTab = () => (
    <div className=\"space-y-6\">
      {/* Métriques principales */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6\">
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Total Factures</CardTitle>
            <FileText className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{quickStats.totalInvoices}</div>
            <p className=\"text-xs text-muted-foreground\">
              {quickStats.draftInvoices} brouillons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Revenus Total</CardTitle>
            <Euro className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-green-600\">
              {formatCurrency(quickStats.totalRevenue)}
            </div>
            <p className=\"text-xs text-muted-foreground\">
              +{revenueGrowth > 0 ? revenueGrowth.toFixed(1) : 0}% ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">En Attente</CardTitle>
            <Clock className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-orange-600\">
              {formatCurrency(quickStats.pendingRevenue)}
            </div>
            <p className=\"text-xs text-muted-foreground\">
              {quickStats.sentInvoices} facture(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Taux Paiement</CardTitle>
            <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold text-blue-600\">
              {paymentEfficiency}%
            </div>
            <p className=\"text-xs text-muted-foreground\">
              {quickStats.overdueInvoices} en retard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Factures récentes */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center justify-between\">
            <span className=\"flex items-center gap-2\">
              <Receipt className=\"w-5 h-5\" />
              Factures récentes
            </span>
            <Button
              variant=\"ghost\"
              size=\"sm\"
              onClick={() => setActiveTab('invoices')}
            >
              Voir tout
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-3\">
            {invoices.slice(0, 5).map((invoice) => {
              const statusInfo = getInvoiceStatusInfo(invoice);

              return (
                <div
                  key={invoice.id}
                  className=\"flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors\"
                  onClick={() => handleInvoiceClick(invoice)}
                >
                  <div className=\"flex-1 min-w-0\">
                    <div className=\"flex items-center gap-3\">
                      <h4 className=\"font-medium\">{invoice.invoice_number}</h4>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className=\"text-sm text-neutral-600 dark:text-neutral-400\">
                      {invoice.project?.title} • {new Date(invoice.issued_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className=\"text-right\">
                    <p className=\"font-bold text-primary\">
                      {formatCurrency(invoice.total_cents)}
                    </p>
                    <p className=\"text-xs text-neutral-500\">
                      Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"flex flex-wrap gap-3\">
            <Button onClick={() => setIsCreating(true)} className=\"flex items-center gap-2\">
              <Plus className=\"w-4 h-4\" />
              Nouvelle facture
            </Button>

            {projects.length > 0 && (
              <Button variant=\"outline\" className=\"flex items-center gap-2\">
                <Zap className=\"w-4 h-4\" />
                Génération auto
              </Button>
            )}

            {showTemplates && (
              <Button variant=\"outline\" onClick={() => setActiveTab('templates')} className=\"flex items-center gap-2\">
                <Template className=\"w-4 h-4\" />
                Templates
              </Button>
            )}

            {showExportOptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant=\"outline\" className=\"flex items-center gap-2\">
                    <Download className=\"w-4 h-4\" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInvoicesTab = () => (
    <div className=\"space-y-6\">
      {/* Header avec contrôles */}
      <div className=\"flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between\">
        <div>
          <h2 className=\"text-2xl font-semibold\">Mes Factures</h2>
          <p className=\"text-neutral-600 dark:text-neutral-400\">
            {totalCount} facture{totalCount !== 1 ? 's' : ''} au total
          </p>
        </div>

        <div className=\"flex items-center gap-3\">
          <div className=\"relative\">
            <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4\" />
            <Input
              placeholder=\"Rechercher factures...\"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className=\"pl-10 w-[250px]\"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value: InvoiceStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className=\"w-[150px]\">
              <SelectValue placeholder=\"Statut\" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"all\">Tous</SelectItem>
              <SelectItem value=\"draft\">Brouillons</SelectItem>
              <SelectItem value=\"sent\">Envoyées</SelectItem>
              <SelectItem value=\"paid\">Payées</SelectItem>
              <SelectItem value=\"overdue\">En retard</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setIsCreating(true)}>
            <Plus className=\"w-4 h-4 mr-2\" />
            Nouvelle
          </Button>
        </div>
      </div>

      {/* Liste des factures */}
      <div className=\"grid grid-cols-1 gap-4\">
        {filteredInvoices.map((invoice) => {
          const statusInfo = getInvoiceStatusInfo(invoice);

          return (
            <Card key={invoice.id} className=\"hover:shadow-md transition-shadow cursor-pointer\">
              <CardContent className=\"p-6\">
                <div className=\"flex items-center justify-between\">
                  <div className=\"flex-1\" onClick={() => handleInvoiceClick(invoice)}>
                    <div className=\"flex items-center gap-4 mb-2\">
                      <h3 className=\"font-semibold text-lg\">{invoice.invoice_number}</h3>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      {invoice.project && (
                        <span className=\"text-sm text-neutral-600 dark:text-neutral-400\">
                          {invoice.project.title}
                        </span>
                      )}
                    </div>

                    <div className=\"flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400\">
                      <span className=\"flex items-center gap-1\">
                        <Calendar className=\"w-4 h-4\" />
                        Émise le {new Date(invoice.issued_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className=\"flex items-center gap-1\">
                        <Clock className=\"w-4 h-4\" />
                        Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div className=\"flex items-center gap-4\">
                    <div className=\"text-right\">
                      <div className=\"text-xl font-bold text-primary\">
                        {formatCurrency(invoice.total_cents)}
                      </div>
                      <div className=\"text-sm text-neutral-500\">
                        TTC
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant=\"ghost\" size=\"sm\">
                          <MoreVertical className=\"w-4 h-4\" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align=\"end\">
                        <DropdownMenuItem onClick={() => handleInvoiceClick(invoice)}>
                          <Eye className=\"w-4 h-4 mr-2\" />
                          Voir détail
                        </DropdownMenuItem>

                        {invoice.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleQuickAction('send', invoice.id)}>
                            <Send className=\"w-4 h-4 mr-2\" />
                            Envoyer
                          </DropdownMenuItem>
                        )}

                        {invoice.status === 'sent' && showStripeIntegration && (
                          <DropdownMenuItem onClick={() => handlePayInvoice(invoice)}>
                            <CreditCard className=\"w-4 h-4 mr-2\" />
                            Payer en ligne
                          </DropdownMenuItem>
                        )}

                        {invoice.status === 'sent' && (
                          <DropdownMenuItem onClick={() => handleQuickAction('mark_paid', invoice.id)}>
                            <CheckCircle className=\"w-4 h-4 mr-2\" />
                            Marquer payée
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleQuickAction('duplicate', invoice.id)}>
                          <Copy className=\"w-4 h-4 mr-2\" />
                          Dupliquer
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleExport('pdf', invoice.id)}>
                          <Download className=\"w-4 h-4 mr-2\" />
                          Télécharger PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleQuickAction('print', invoice.id)}>
                          <Printer className=\"w-4 h-4 mr-2\" />
                          Imprimer
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {invoice.status !== 'paid' && (
                          <DropdownMenuItem
                            onClick={() => handleQuickAction('delete', invoice.id)}
                            className=\"text-red-600 dark:text-red-400\"
                          >
                            <Trash2 className=\"w-4 h-4 mr-2\" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bouton Charger plus */}
      {hasMore && (
        <div className=\"text-center\">
          <Button onClick={loadMore} disabled={loading} variant=\"outline\">
            {loading ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );

  // ==========================================
  // GESTION DES ERREURS
  // ==========================================

  if (error) {
    return (
      <Card className=\"p-6\">
        <div className=\"text-center text-red-600 dark:text-red-400\">
          <p>Erreur lors du chargement des factures: {error}</p>
          <Button onClick={refresh} className=\"mt-4\">
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className=\"w-full\">
        <TabsList className=\"grid w-full grid-cols-4\">
          {showOverview && (
            <TabsTrigger value=\"overview\" className=\"flex items-center gap-2\">
              <BarChart3 className=\"w-4 h-4\" />
              Vue d'ensemble
            </TabsTrigger>
          )}
          <TabsTrigger value=\"invoices\" className=\"flex items-center gap-2\">
            <FileText className=\"w-4 h-4\" />
            Factures ({totalCount})
          </TabsTrigger>
          {showStats && (
            <TabsTrigger value=\"stats\" className=\"flex items-center gap-2\">
              <TrendingUp className=\"w-4 h-4\" />
              Statistiques
            </TabsTrigger>
          )}
          {showTemplates && (
            <TabsTrigger value=\"templates\" className=\"flex items-center gap-2\">
              <Template className=\"w-4 h-4\" />
              Templates
            </TabsTrigger>
          )}
        </TabsList>

        {showOverview && (
          <TabsContent value=\"overview\">
            {renderOverviewTab()}
          </TabsContent>
        )}

        <TabsContent value=\"invoices\">
          {renderInvoicesTab()}
        </TabsContent>

        {showStats && (
          <TabsContent value=\"stats\">
            <div className=\"text-center py-8\">
              <TrendingUp className=\"w-12 h-12 mx-auto text-neutral-400 mb-4\" />
              <p className=\"text-neutral-600 dark:text-neutral-400\">
                Interface de statistiques en cours de développement
              </p>
            </div>
          </TabsContent>
        )}

        {showTemplates && (
          <TabsContent value=\"templates\">
            <div className=\"text-center py-8\">
              <Template className=\"w-12 h-12 mx-auto text-neutral-400 mb-4\" />
              <p className=\"text-neutral-600 dark:text-neutral-400\">
                Interface de templates en cours de développement
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modale de création de facture */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className=\"max-w-2xl\">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle facture</DialogTitle>
          </DialogHeader>
          <InvoiceEditor
            projects={projects}
            templates={templates}
            onSave={handleCreateInvoice}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==========================================
// COMPOSANTS INTERNES
// ==========================================

interface InvoiceEditorProps {
  invoice?: Invoice;
  projects: any[];
  templates: any[];
  onSave: (data: CreateInvoiceData) => void;
  onCancel: () => void;
}

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoice,
  projects,
  templates,
  onSave,
  onCancel
}) => {
  const [projectId, setProjectId] = useState(invoice?.project_id || '');
  const [periodStart, setPeriodStart] = useState(invoice?.period_start || '');
  const [periodEnd, setPeriodEnd] = useState(invoice?.period_end || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [templateId, setTemplateId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !periodStart || !periodEnd) return;

    onSave({
      project_id: projectId,
      period_start: periodStart,
      period_end: periodEnd,
      notes: notes.trim() || undefined,
      auto_generate_items: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className=\"space-y-4\">
      <div>
        <label className=\"block text-sm font-medium mb-2\">Projet *</label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder=\"Sélectionner un projet\" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className=\"grid grid-cols-2 gap-4\">
        <div>
          <label className=\"block text-sm font-medium mb-2\">Date de début *</label>
          <Input
            type=\"date\"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className=\"block text-sm font-medium mb-2\">Date de fin *</label>
          <Input
            type=\"date\"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <label className=\"block text-sm font-medium mb-2\">Template (optionnel)</label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder=\"Sélectionner un template\" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"\">Aucun template</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className=\"block text-sm font-medium mb-2\">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder=\"Notes additionnelles...\"
          rows={3}
          className=\"w-full p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 resize-none\"
        />
      </div>

      <div className=\"flex justify-end gap-3 pt-4\">
        <Button type=\"button\" variant=\"outline\" onClick={onCancel}>
          Annuler
        </Button>
        <Button type=\"submit\" disabled={!projectId || !periodStart || !periodEnd}>
          {invoice ? 'Mettre à jour' : 'Créer la facture'}
        </Button>
      </div>
    </form>
  );
};