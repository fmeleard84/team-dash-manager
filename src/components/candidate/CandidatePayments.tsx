import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedProject, setSelectedProject] = useState<string>('all');
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
  }, [user, startDate, endDate, selectedProject]);

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
        .eq('assigned_resource_id', user.id);
      
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
        
        if (selectedProject !== 'all') {
          paymentsQuery = paymentsQuery.eq('project_id', selectedProject);
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
      {/* Header with filters */}
      <div className="bg-gradient-to-r from-green-50 via-white to-blue-50 p-8 rounded-2xl border border-green-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Euro className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Mes Paiements
            </h1>
            <p className="text-gray-600 mt-1">
              Suivi de vos revenus et paiements validés
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40 bg-white border-green-200 focus:border-green-400"
          />
          <span className="text-gray-500">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40 bg-white border-green-200 focus:border-green-400"
          />
          
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64 bg-white border-green-200 focus:border-green-400">
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Revenus totaux</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(candidateEarnings)}
                </p>
              </div>
              <Euro className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Heures facturées</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatMinutesToHours(totalMinutesWorked)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Paiements reçus</p>
                <p className="text-2xl font-bold text-purple-800">
                  {totalPayments}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Taux horaire</p>
                <p className="text-2xl font-bold text-orange-800">
                  {candidateHourlyRate}€/h
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
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