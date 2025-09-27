import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { DatePicker } from '@/ui/components/date-picker';
import { PageHeaderNeon } from '@/ui/components/page-header-neon';
import { ProjectSelectorNeon } from '@/ui/components/project-selector-neon';
import { Button } from '@/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/components/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import {
  Euro,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Receipt,
  Briefcase,
  Activity,
  Download,
  Eye,
  Play,
  Pause,
  Square,
  FileText,
  BarChart3,
  Timer,
  DollarSign
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

// Import hooks from the payments module
import { usePayments } from '../hooks/usePayments';
import { usePaymentActions } from '../hooks/usePaymentActions';
import { usePaymentStats } from '../hooks/usePaymentStats';
import { useTimeTracking } from '../hooks/useTimeTracking';

// Import types
import {
  Payment,
  PaymentFilters,
  PaymentStatus,
  PaymentExportFormat,
  TimeRecord,
  PaymentStats as IPaymentStats
} from '../types';

interface ModularPaymentsViewProps {
  candidateId: string;
  className?: string;
  availableProjects?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

export const ModularPaymentsView: React.FC<ModularPaymentsViewProps> = ({
  candidateId,
  className = '',
  availableProjects = []
}) => {
  // Date range state - default to last 4 weeks
  const today = new Date();
  const fourWeeksAgo = subWeeks(today, 4);
  const [startDate, setStartDate] = useState(format(fourWeeksAgo, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize filters
  const filters: PaymentFilters = useMemo(() => ({
    project_id: selectedProjectId || undefined,
    payment_date_from: startDate,
    payment_date_to: endDate,
    sort_by: 'payment_date',
    sort_order: 'desc',
    per_page: 50,
    page: 1
  }), [selectedProjectId, startDate, endDate]);

  // Initialize hooks
  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    stats,
    refetch: refetchPayments
  } = usePayments({
    candidateId,
    initialFilters: filters,
    autoRefresh: true,
    realtime: true
  });

  const {
    stats: detailedStats,
    loading: statsLoading,
    refreshStats,
    getTaxReport,
    calculateGrowth,
    predictFutureEarnings
  } = usePaymentStats({
    candidateId,
    autoRefresh: true
  });

  const {
    exportPayments,
    generateInvoice,
    downloadPaymentProof
  } = usePaymentActions();

  const {
    activeSession,
    todayRecords,
    loading: trackingLoading,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    getTotalToday,
    getTotalThisWeek
  } = useTimeTracking({
    candidateId,
    projectId: selectedProjectId,
    autoSave: true
  });

  // Utility functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      validated: { label: 'Validé', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      processing: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Activity },
      paid: { label: 'Payé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700', icon: Square },
      disputed: { label: 'Contesté', color: 'bg-orange-100 text-orange-700', icon: Receipt }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Handle export
  const handleExport = async (format: PaymentExportFormat) => {
    try {
      await exportPayments(candidateId, filters, format);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!payments.length) return {
      totalEarnings: 0,
      totalHours: 0,
      paymentCount: 0,
      averageHourlyRate: 0
    };

    const totalEarnings = payments.reduce((sum, p) => sum + p.amount_cents, 0);
    const totalHours = payments.reduce((sum, p) => sum + (p.hours_worked || 0), 0);
    const paymentCount = payments.length;
    const averageHourlyRate = totalHours > 0 ? (totalEarnings / 100) / totalHours : 0;

    return {
      totalEarnings,
      totalHours,
      paymentCount,
      averageHourlyRate
    };
  }, [payments]);

  if (paymentsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des paiements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with filters */}
      <PageHeaderNeon
        title="Mes Paiements"
        description="Suivi de vos revenus, temps de travail et paiements"
        icon={Euro}
        iconColor="from-green-500 to-emerald-500"
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date filters */}
          <div className="flex items-center gap-3">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Date de début"
              className="w-44 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400"
              maxDate={endDate}
            />
            <span className="text-gray-400 font-medium">→</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Date de fin"
              className="w-44 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400"
              minDate={startDate}
            />
          </div>

          {/* Project selector */}
          <ProjectSelectorNeon
            projects={availableProjects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            placeholder="Tous les projets"
            className="w-64"
            showStatus={false}
            showDates={false}
          />

          {/* Export buttons */}
          <Select onValueChange={(format) => handleExport(format as PaymentExportFormat)}>
            <SelectTrigger className="w-36 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white">
              <SelectValue placeholder="Exporter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeaderNeon>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-black/40 backdrop-blur-xl border border-purple-500/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <DollarSign className="w-4 h-4 mr-2" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <Timer className="w-4 h-4 mr-2" />
            Suivi temps
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Revenus totaux */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-400 mb-1">Revenus totaux</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        {formatCurrency(dashboardStats.totalEarnings)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Euro className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Heures facturées */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-400 mb-1">Heures facturées</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatMinutesToHours(dashboardStats.totalHours * 60)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Paiements reçus */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-400 mb-1">Paiements reçus</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {dashboardStats.paymentCount}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Taux horaire moyen */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-orange-500/30 hover:border-orange-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-400 mb-1">Taux horaire moyen</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                        {Math.round(dashboardStats.averageHourlyRate)}€/h
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Today's tracking summary */}
          {!trackingLoading && (
            <Card className="bg-black/40 backdrop-blur-xl border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-400">Suivi d'aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Temps travaillé aujourd'hui</p>
                      <p className="text-xl font-semibold text-blue-400">
                        {formatMinutesToHours(getTotalToday())}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-gray-600" />
                    <div>
                      <p className="text-sm text-gray-400">Cette semaine</p>
                      <p className="text-xl font-semibold text-cyan-400">
                        {formatMinutesToHours(getTotalThisWeek())}
                      </p>
                    </div>
                  </div>

                  {/* Active session indicator */}
                  {activeSession && (
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-sm text-green-400">Session active</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {payments.length === 0 ? (
            <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
              <CardContent className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">Aucun paiement pour cette période</p>
                <p className="text-sm text-gray-500">
                  Les paiements apparaîtront ici une fois validés par le client
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white">Historique des paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-300">Projet</TableHead>
                      <TableHead className="text-gray-300">Période</TableHead>
                      <TableHead className="text-gray-300">Heures</TableHead>
                      <TableHead className="text-gray-300">Montant</TableHead>
                      <TableHead className="text-gray-300">Date paiement</TableHead>
                      <TableHead className="text-gray-300">Statut</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-white">{payment.project_name || 'Projet'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-300">
                              {format(new Date(payment.period_start), 'dd/MM', { locale: fr })} -
                              {format(new Date(payment.period_end), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-blue-400">
                              {formatMinutesToHours((payment.hours_worked || 0) * 60)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-400">
                            {formatCurrency(payment.amount_cents)}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.payment_status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadPaymentProof(payment.id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateInvoice(payment.id)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          {/* Time tracking controls and records would go here */}
          <Card className="bg-black/40 backdrop-blur-xl border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400">Suivi du temps de travail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Interface de suivi du temps en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics and predictions would go here */}
          <Card className="bg-black/40 backdrop-blur-xl border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-orange-400">Analytiques et prédictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Graphiques et prédictions de revenus en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModularPaymentsView;