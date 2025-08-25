import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Download,
  CreditCard,
  Printer,
  FileText,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Clock
} from 'lucide-react';
import { useInvoices, Invoice, CompanyInfo } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface InvoiceDetailProps {
  invoiceId: string;
  onBack: () => void;
  onPay: (invoiceId: string) => void;
}

const InvoiceDetail = ({ invoiceId, onBack, onPay }: InvoiceDetailProps) => {
  const { user } = useAuth();
  const {
    getInvoiceById,
    formatCurrency,
    formatMinutesToHours,
    getInvoiceStatus,
    companyInfo
  } = useInvoices();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceDetails();
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      
      // Load invoice
      const invoiceData = await getInvoiceById(invoiceId);
      if (invoiceData) {
        setInvoice(invoiceData);
        
        // Load client info
        const { data: client } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', invoiceData.client_id)
          .single();
        
        setClientInfo(client);
      }
    } catch (error) {
      console.error('Error loading invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This will be implemented with PDF generation
    console.log('Download PDF');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de la facture...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600">Facture non trouvée</p>
          <Button onClick={onBack} className="mt-4">
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = getInvoiceStatus(invoice);
  const isOverdue = status.label === 'En retard';

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux factures
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Télécharger PDF
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              onClick={() => onPay(invoice.id)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Régler cette facture
            </Button>
          )}
        </div>
      </div>

      {/* Invoice document */}
      <Card className="invoice-document">
        <CardContent className="p-8">
          {/* Invoice header */}
          <div className="flex justify-between items-start mb-8">
            {/* Company info */}
            <div>
              <h1 className="text-2xl font-bold text-purple-600 mb-2">
                {companyInfo?.company_name || 'Ialla'}
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {companyInfo?.address_line1}
                </p>
                <p className="ml-6">
                  {companyInfo?.postal_code} {companyInfo?.city}
                </p>
                {companyInfo?.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {companyInfo.phone}
                  </p>
                )}
                {companyInfo?.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {companyInfo.email}
                  </p>
                )}
              </div>
            </div>

            {/* Client info */}
            <div className="text-right">
              <h2 className="text-lg font-semibold mb-2">Facturé à:</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {clientInfo?.first_name} {clientInfo?.last_name}
                </p>
                {clientInfo?.company && (
                  <p className="flex items-center justify-end gap-2">
                    <Building className="w-4 h-4" />
                    {clientInfo.company}
                  </p>
                )}
                <p className="flex items-center justify-end gap-2">
                  <Mail className="w-4 h-4" />
                  {clientInfo?.email}
                </p>
                {clientInfo?.phone && (
                  <p className="flex items-center justify-end gap-2">
                    <Phone className="w-4 h-4" />
                    {clientInfo.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice details */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">N° Facture</p>
                <p className="font-semibold">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date d'émission</p>
                <p className="font-semibold">
                  {format(new Date(invoice.issued_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date d'échéance</p>
                <p className={cn("font-semibold", isOverdue && "text-red-600")}>
                  {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <Badge className={cn(status.color)}>
                  {status.label}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-600">Projet</p>
              <p className="font-semibold">{invoice.project?.title}</p>
              <p className="text-sm text-gray-500">
                Période du {format(new Date(invoice.period_start), 'dd/MM/yyyy')} au {format(new Date(invoice.period_end), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>

          {/* Invoice items */}
          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-semibold">Détail des prestations</h3>
            
            {invoice.items?.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {item.service_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {item.candidate?.first_name} {item.candidate?.last_name}
                    </p>
                    
                    {/* Task details */}
                    <div className="mt-3 space-y-1">
                      {item.task_details.map((task, index) => (
                        <div key={index} className="flex justify-between text-sm text-gray-500">
                          <span className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {task.description}
                          </span>
                          <span>{formatMinutesToHours(task.duration_minutes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">
                      {formatMinutesToHours(item.total_minutes)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.rate_per_minute_cents)}/min
                    </p>
                    <p className="font-semibold text-lg">
                      {formatCurrency(item.amount_cents)} HT
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA ({invoice.vat_rate}%)</span>
                <span className="font-medium">{formatCurrency(invoice.vat_amount_cents)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-purple-600">{formatCurrency(invoice.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          {invoice.status === 'paid' && invoice.payment_date && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✓ Facture réglée le {format(new Date(invoice.payment_date), 'dd/MM/yyyy', { locale: fr })}
              </p>
              {invoice.payment_method && (
                <p className="text-sm text-green-600">
                  Mode de paiement: {invoice.payment_method}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
            <p>Merci pour votre confiance</p>
            {companyInfo?.siret && (
              <p>SIRET: {companyInfo.siret}</p>
            )}
            {companyInfo?.vat_number && (
              <p>N° TVA: {companyInfo.vat_number}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetail;