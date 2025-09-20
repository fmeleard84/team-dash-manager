import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';
import { ProjectSelectorNeon } from '@/components/ui/project-selector-neon';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Euro,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Receipt,
  Briefcase,
  Activity
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const CandidatePayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [timeRecords, setTimeRecords] = useState<any[]>([]);

  // Date filters - default to last 4 weeks
  const today = new Date();
  const fourWeeksAgo = subWeeks(today, 4);
  const [startDate, setStartDate] = useState(format(fourWeeksAgo, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

  // Load projects and payments
  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user, startDate, endDate, selectedProjectId]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load projects where candidate is assigned
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          project_id,
          projects (
            id,
            title,
            status
          )
        `)
        .eq('candidate_id', user.id);
      
      if (assignments) {
        const uniqueProjects = assignments
          .filter(a => a.projects)
          .map(a => a.projects)
          .filter((project, index, self) => 
            index === self.findIndex((p) => p.id === project.id)
          );
        setProjects(uniqueProjects);
        
        // Load payments for these projects
        const projectIds = uniqueProjects.map(p => p.id);
        
        let paymentsQuery = supabase
          .from('invoice_payments')
          .select('*')
          .in('project_id', projectIds)
          .gte('period_start', startDate)
          .lte('period_end', endDate)
          .order('payment_date', { ascending: false });
        
        if (selectedProjectId && selectedProjectId !== '') {
          paymentsQuery = paymentsQuery.eq('project_id', selectedProjectId);
        }
        
        const { data: paymentsData, error: paymentsError } = await paymentsQuery;
        
        if (paymentsError) {
          console.log('Note: invoice_payments table might not exist yet');
          setPayments([]);
          return;
        }
        
        if (paymentsData) {
          // Enrich payments with project info
          const enrichedPayments = paymentsData.map(payment => {
            const project = uniqueProjects.find(p => p.id === payment.project_id);
            return {
              ...payment,
              project
            };
          });
          setPayments(enrichedPayments);
          
          // Load time tracking records for these payments
          await loadTimeRecords(enrichedPayments);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeRecords = async (payments: any[]) => {
    if (!user?.id || payments.length === 0) return;
    
    try {
      // Load all time records for the payment periods
      const records = [];
      
      for (const payment of payments) {
        const { data } = await supabase
          .from('time_tracking_sessions')
          .select('*')
          .eq('project_id', payment.project_id)
          .eq('candidate_id', user.id)
          .gte('start_time', `${payment.period_start}T00:00:00`)
          .lte('start_time', `${payment.period_end}T23:59:59`)
          .eq('status', 'completed');
        
        if (data) {
          records.push(...data.map(r => ({
            ...r,
            payment_id: payment.id,
            project_id: payment.project_id
          })));
        }
      }
      
      setTimeRecords(records);
    } catch (error) {
      console.error('Error loading time records:', error);
    }
  };

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

  // Calculate stats
  const totalPaid = payments.reduce((sum, p) => sum + p.total_cents, 0);
  const totalPayments = payments.length;
  const averagePerPayment = totalPayments > 0 ? totalPaid / totalPayments : 0;
  
  // Calculate candidate's share (assuming 45€/hour rate)
  const candidateHourlyRate = 45; // €/hour
  const candidateMinuteRate = candidateHourlyRate / 60; // €/minute
  
  // Calculate total minutes worked by this candidate for paid periods
  const totalMinutesWorked = timeRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const candidateEarnings = Math.round(totalMinutesWorked * candidateMinuteRate * 100); // in cents

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des paiements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with unified modern design - Using Messages style selector */}
      <PageHeaderNeon
        icon={Euro}
        title="Mes Paiements"
        subtitle="Suivi de vos revenus et paiements validés"
        projects={projects.map(p => ({ ...p, created_at: p.project_date || p.created_at }))}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        projectSelectorConfig={{
          placeholder: "Tous les projets",
          showStatus: true,
          showDates: true,
          showTeamProgress: false,
          className: "w-[350px]"
        }}
      />

      {/* Stats cards with neon design */}
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
                    {formatCurrency(candidateEarnings)}
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
                    {formatMinutesToHours(totalMinutesWorked)}
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
                    {totalPayments}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Taux horaire */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
          <Card className="relative bg-black/40 backdrop-blur-xl border-orange-500/30 hover:border-orange-400/50 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-400 mb-1">Taux horaire</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                    {candidateHourlyRate}€/h
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

      {/* Payments table */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">Aucun paiement pour cette période</p>
            <p className="text-sm text-gray-500">
              Les paiements apparaîtront ici une fois validés par le client
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Heures travaillées</TableHead>
                  <TableHead>Montant gagné</TableHead>
                  <TableHead>Date de paiement</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  // Calculate candidate's hours for this payment
                  const paymentRecords = timeRecords.filter(r => r.payment_id === payment.id);
                  const minutesWorked = paymentRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
                  const earnings = Math.round(minutesWorked * candidateMinuteRate * 100);
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{payment.project?.title || 'Projet'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {format(new Date(payment.period_start), 'dd/MM', { locale: fr })} - 
                            {format(new Date(payment.period_end), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-blue-700">
                            {formatMinutesToHours(minutesWorked)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          {formatCurrency(earnings)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Payé
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};