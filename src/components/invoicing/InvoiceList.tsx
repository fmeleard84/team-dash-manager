import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText,
  Download,
  CreditCard,
  Eye,
  Plus,
  Calendar,
  Euro,
  Clock,
  ChevronRight,
  ChevronDown,
  User,
  Briefcase,
  Receipt
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useInvoices } from '@/hooks/useInvoices';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import InvoiceDetail from './InvoiceDetail';
import { StripePayment } from './StripePayment';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceListProps {
  projectId?: string;
}

export const InvoiceList = ({ projectId }: InvoiceListProps) => {
  const { user } = useAuth();
  const {
    invoices,
    projects,
    loading,
    formatCurrency,
    getInvoiceStatus,
    formatMinutesToHours
  } = useInvoices(projectId);
  
  // Initialize with current week
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(weekStart, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(weekEnd, 'yyyy-MM-dd'));
  const [trackingRecords, setTrackingRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [paidInvoices, setPaidInvoices] = useState<Set<string>>(new Set());

  // Determine period status based on dates
  const getPeriodStatus = (startDate: string, endDate: string, projectId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    const weekEnd = new Date(endDate);
    weekEnd.setHours(23, 59, 59, 999); // End of day
    
    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0); // Start of day
    
    // Check if week is current
    if (today >= weekStart && today <= weekEnd) {
      return { status: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-700' };
    }
    
    // Check if week is past
    if (today > weekEnd) {
      // TODO: Check Stripe payment status here
      // For now, assume unpaid if past
      return { status: 'a_regler', label: 'À régler', color: 'bg-red-100 text-red-700' };
    }
    
    // Future week
    return { status: 'future', label: 'À venir', color: 'bg-gray-100 text-gray-700' };
  };

  // Load tracking records for the selected period
  const loadTrackingRecords = async () => {
    if (!user?.id) return;
    
    setLoadingRecords(true);
    try {
      console.log('Loading tracking records for period:', startDate, 'to', endDate);
      console.log('Selected project:', selectedProject);
      console.log('User projects:', projects);
      
      // First, let's check ALL records to debug
      const { data: allRecords, error: allError } = await supabase
        .from('active_time_tracking')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(20);
      
      console.log('DEBUG - Last 20 tracking records:', allRecords);
      
      // Build query - use time_tracking_sessions instead of active_time_tracking
      // active_time_tracking is only for currently active sessions
      let query = supabase
        .from('time_tracking_sessions')
        .select('*')
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`)
        .eq('status', 'completed'); // Only completed sessions
      
      // Filter by project if selected
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      } else {
        // Get all projects owned by this client
        const projectIds = projects.map(p => p.id);
        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds);
        }
      }
      
      const { data: trackingData, error } = await query;
      
      if (error) throw error;
      
      if (!trackingData || trackingData.length === 0) {
        console.log('No tracking records found for this period');
        setTrackingRecords([]);
        return;
      }
      
      // Get unique project and candidate IDs
      const projectIds = [...new Set(trackingData.map(r => r.project_id))];
      const candidateIds = [...new Set(trackingData.map(r => r.candidate_id))];
      
      // Batch fetch projects and candidates
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, status')
        .in('id', projectIds);
      
      const { data: candidatesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', candidateIds);
      
      // Create lookup maps
      const projectsMap = (projectsData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      
      const candidatesMap = (candidatesData || []).reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {});
      
      // Enrich records - time_tracking_sessions has different structure
      const enrichedRecords = trackingData.map(record => ({
        ...record,
        project: projectsMap[record.project_id] || { id: record.project_id, title: 'Projet inconnu' },
        candidate: candidatesMap[record.candidate_id] || { id: record.candidate_id, first_name: 'Inconnu', last_name: '' },
        // Map fields to match expected structure
        activity_description: record.activity_description,
        duration_minutes: record.duration_minutes,
        start_time: record.start_time
      }));
      
      console.log('Tracking records loaded:', enrichedRecords.length, 'records');
      setTrackingRecords(enrichedRecords);
    } catch (error) {
      console.error('Error loading tracking records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Load records when dates or project change
  useEffect(() => {
    if (startDate && endDate) {
      loadTrackingRecords();
      loadPaidInvoices();
    }
  }, [startDate, endDate, selectedProject, projects]);
  
  // Load paid invoices for the period
  const loadPaidInvoices = async () => {
    if (!user?.id) return;
    
    try {
      const { data: payments, error } = await supabase
        .from('invoice_payments')
        .select('project_id, period_start, period_end')
        .eq('client_id', user.id)
        .eq('period_start', startDate)
        .eq('period_end', endDate);
      
      if (error) {
        // Table might not exist yet, ignore the error
        console.log('Note: invoice_payments table might not exist yet');
        return;
      }
      
      if (payments) {
        const paidSet = new Set(payments.map(p => `${p.project_id}_${p.period_start}_${p.period_end}`));
        setPaidInvoices(paidSet);
      }
    } catch (error) {
      console.error('Error loading paid invoices:', error);
    }
  };

  // Group records by project
  const recordsByProject = trackingRecords.reduce((acc: any, record) => {
    const projectId = record.project?.id || record.project_id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: record.project,
        records: []
      };
    }
    acc[projectId].records.push(record);
    return acc;
  }, {});


  const handlePayInvoice = (invoice: any) => {
    setPaymentInvoice(invoice);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentOpen(false);
    setPaymentInvoice(null);
    // Refresh paid invoices list
    loadPaidInvoices();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des factures...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedInvoice) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
        onPay={handlePayInvoice}
      />
    );
  }

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with filters - Exact Planning style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          
          {/* Date filters */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 bg-white border-purple-200 focus:border-purple-400"
            />
            <span className="text-gray-500">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 bg-white border-purple-200 focus:border-purple-400"
            />
          </div>
          
          {/* Project filter */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
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

      {/* Summary card - only show if there are records */}
      {trackingRecords.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Période</p>
                <p className="font-semibold">
                  {format(new Date(startDate), 'dd/MM', { locale: fr })} - {format(new Date(endDate), 'dd/MM', { locale: fr })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Temps total</p>
                <p className="font-semibold text-blue-600">
                  {formatMinutesToHours(trackingRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Montant TTC</p>
                <p className="font-semibold text-purple-600">
                  {formatCurrency(
                    trackingRecords.reduce((sum, r) => sum + ((r.duration_minutes || 0) * 0.75 * 1.20 * 100), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking records by project */}
      {loadingRecords ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </CardContent>
        </Card>
      ) : Object.keys(recordsByProject).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">Aucun temps tracké pour cette période</p>
            <p className="text-sm text-gray-500">
              Sélectionnez une autre période ou un autre projet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Display tracking records grouped by project */}
          {Object.entries(recordsByProject).map(([projectId, projectData]: [string, any]) => {
            const projectRecords = projectData.records;
            const projectInfo = projectData.project || { title: 'Projet inconnu' };
            
            // Calculate totals for this project
            const totalMinutes = projectRecords.reduce((sum: number, r: any) => 
              sum + (r.duration_minutes || 0), 0
            );
            const hourlyRate = 0.75; // 45€/hour = 0.75€/min
            const subtotal = totalMinutes * hourlyRate;
            const vat = subtotal * 0.20;
            const total = subtotal + vat;
            
            // Group by candidate
            const recordsByCandidate = projectRecords.reduce((acc: any, record: any) => {
              const candidateId = record.candidate?.id || record.candidate_id;
              if (!acc[candidateId]) {
                acc[candidateId] = {
                  candidate: record.candidate,
                  records: []
                };
              }
              acc[candidateId].records.push(record);
              return acc;
            }, {});
            
            const isExpanded = expandedProjects.has(projectId);
            const invoiceKey = `${projectId}_${startDate}_${endDate}`;
            const isPaid = paidInvoices.has(invoiceKey);
            
            // Update invoice status based on payment
            let invoiceStatus = getPeriodStatus(startDate, endDate, projectId);
            if (isPaid) {
              invoiceStatus = { status: 'paye', label: 'Payé', color: 'bg-green-100 text-green-700' };
            }
            
            // Check if payment is needed (not paid and not future)
            const needsPayment = !isPaid && (invoiceStatus.status === 'a_regler' || invoiceStatus.status === 'en_cours');
            
            console.log('Invoice status for', projectInfo.title, ':', invoiceStatus.status, 'isPaid:', isPaid, 'needsPayment:', needsPayment);
            
            return (
              <Card key={projectId} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleProjectExpanded(projectId)}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left cursor-pointer">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-left">{projectInfo.title}</CardTitle>
                        <Badge className={invoiceStatus.color}>
                          {invoiceStatus.label}
                        </Badge>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-blue-100 text-blue-700">
                          {formatMinutesToHours(totalMinutes)}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 font-bold">
                          {formatCurrency(total * 100)} TTC
                        </Badge>
                        {needsPayment && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayInvoice({
                                project_id: projectId,
                                total_cents: total * 100,
                                period_start: startDate,
                                period_end: endDate
                              });
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Payer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-6">
                      {/* Compact summary */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Période:</span>
                            <p className="font-medium">
                              {format(new Date(startDate), 'dd/MM', { locale: fr })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Candidats:</span>
                            <p className="font-medium">{Object.keys(recordsByCandidate).length} ressource(s)</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sessions:</span>
                            <p className="font-medium">{projectRecords.length} enregistrement(s)</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detailed records by candidate */}
                      {Object.entries(recordsByCandidate).map(([candidateId, candidateData]: [string, any]) => {
                        const candidateRecords = candidateData.records;
                        const candidateInfo = candidateData.candidate || { first_name: 'Inconnu', last_name: '' };
                        const candidateTotalMinutes = candidateRecords.reduce((sum: number, r: any) => 
                          sum + (r.duration_minutes || 0), 0
                        );
                        
                        return (
                          <div key={candidateId} className="mb-6 last:mb-0">
                            <div className="flex items-center justify-between mb-3 px-2 py-1 bg-blue-50 rounded">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <h4 className="font-semibold">
                                  {candidateInfo.first_name} {candidateInfo.last_name}
                                </h4>
                              </div>
                              <span className="text-sm font-medium text-blue-700">
                                {formatMinutesToHours(candidateTotalMinutes)} - {formatCurrency(candidateTotalMinutes * hourlyRate * 100)}
                              </span>
                            </div>
                            
                            <div className="space-y-1 ml-6">
                              {candidateRecords.map((record: any) => (
                                <div key={record.id} className="flex justify-between items-start py-2 px-2 hover:bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{record.activity_description || 'Développement'}</p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(record.start_time), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{record.duration_minutes || 0} min</p>
                                    <p className="text-xs text-gray-500">
                                      {formatCurrency((record.duration_minutes || 0) * hourlyRate * 100)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Totals for this project */}
                      <div className="mt-6 pt-6 border-t bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Sous-total HT</span>
                            <span className="font-medium">{formatCurrency(subtotal * 100)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>TVA (20%)</span>
                            <span className="font-medium">{formatCurrency(vat * 100)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t border-purple-200">
                            <span>Total TTC</span>
                            <span className="text-purple-600">{formatCurrency(total * 100)}</span>
                          </div>
                        </div>
                        
                        {/* Payment button for expanded view if needed */}
                        {needsPayment && (
                          <div className="mt-4 pt-4 border-t border-purple-200">
                            <Button
                              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              onClick={() => handlePayInvoice({
                                project_id: projectId,
                                total_cents: total * 100,
                                period_start: startDate,
                                period_end: endDate
                              })}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Régler cette facture
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
          
          {/* Grand total for all projects */}
          {Object.keys(recordsByProject).length > 1 && (
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">Total général</h3>
                    <p className="text-sm text-gray-600">
                      {Object.keys(recordsByProject).length} projets
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        Object.values(recordsByProject).reduce((sum: number, projectData: any) => {
                          const minutes = projectData.records.reduce((s: number, r: any) => 
                            s + (r.duration_minutes || 0), 0
                          );
                          return sum + (minutes * 0.75 * 1.20 * 100); // With VAT
                        }, 0)
                      )}
                    </p>
                    <p className="text-sm text-gray-600">TTC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stripe Payment Modal */}
      {isPaymentOpen && paymentInvoice && (
        <StripePayment
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setPaymentInvoice(null);
          }}
          invoiceData={paymentInvoice}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};