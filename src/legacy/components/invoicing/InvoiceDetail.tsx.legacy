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

        // Load client info from client_profiles
        const { data: client } = await supabase
          .from('client_profiles')
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
      <div className="flex items-center justify-between no-print">
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

      {/* Invoice document - Style inspired by Luna model */}
      <Card className="invoice-document bg-white print:shadow-none">
        <CardContent className="p-8">
          {/* Invoice Title */}
          <h1 className="text-3xl font-bold mb-8">Facture</h1>

          {/* Invoice details in header */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <p className="text-sm text-gray-600">Numéro de facture</p>
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
          </div>

          {/* Company and Client info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Vaya info (left) */}
            <div>
              <h2 className="text-lg font-bold mb-2">Vaya</h2>
              <div className="text-sm space-y-0.5">
                <p className="text-gray-700">6 Rue de Verdun</p>
                <p className="text-gray-700">13840 Rognes, FR</p>
                <p className="text-gray-700">contact@vaya.fr</p>
                <p className="text-gray-700 font-semibold">85234791200015</p>
              </div>
            </div>

            {/* Client info (right) */}
            <div>
              <h2 className="text-lg font-bold mb-2 uppercase">
                {clientInfo?.company_name || 'CLIENT'}
              </h2>
              <div className="text-sm space-y-0.5">
                <p className="text-gray-700">
                  {clientInfo?.first_name} {clientInfo?.last_name}
                </p>
                {clientInfo?.address && (
                  <p className="text-gray-700">{clientInfo.address}</p>
                )}
                {(clientInfo?.postal_code || clientInfo?.city) && (
                  <p className="text-gray-700">
                    {clientInfo?.postal_code} {clientInfo?.city?.toUpperCase()}, FR
                  </p>
                )}
                {clientInfo?.siret && (
                  <p className="text-gray-700 font-semibold">{clientInfo.siret}</p>
                )}
                {clientInfo?.vat_number && (
                  <p className="text-gray-700">Numéro de TVA: {clientInfo.vat_number}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice items table */}
          <div className="mb-8">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3">Qté</th>
                  <th className="text-right p-3">Prix unitaire</th>
                  <th className="text-center p-3">TVA (%)</th>
                  <th className="text-right p-3">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => {
                  const days = Math.ceil(item.total_minutes / 480); // 8 hours per day
                  const dailyRate = (item.amount_cents / days) / 100; // Convert cents to euros

                  return (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-3">
                        <div>
                          <p className="font-semibold">
                            {format(new Date(invoice.period_start), 'MMMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{item.service_name}</p>
                          {item.task_details.map((task, idx) => (
                            <p key={idx} className="text-xs text-gray-500 ml-2">
                              - {task.description}
                            </p>
                          ))}
                          <p className="text-xs text-gray-500 mt-1">
                            Intervenant: {item.candidate?.first_name} {item.candidate?.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        {days} j
                      </td>
                      <td className="text-right p-3">
                        {dailyRate.toFixed(2)} €
                      </td>
                      <td className="text-center p-3">20 %</td>
                      <td className="text-right p-3 font-semibold">
                        {(item.amount_cents / 100).toFixed(2)} €
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-8">
            <div className="w-80">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between py-2">
                  <span className="font-semibold">Total HT</span>
                  <span className="font-semibold">
                    {(invoice.subtotal_cents / 100).toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Montant total de la TVA</span>
                  <span>{(invoice.vat_amount_cents / 100).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Total TTC</span>
                  <span>{(invoice.total_cents / 100).toFixed(2)} €</span>
                </div>
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

          {/* Payment details */}
          <div className="mt-12 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-3">Détails du paiement</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Nom du bénéficiaire</p>
                <p className="font-medium">Vaya</p>
              </div>
              <div>
                <p className="text-gray-600">BIC</p>
                <p className="font-medium">QNTOFRP1XXX</p>
              </div>
              <div>
                <p className="text-gray-600">IBAN</p>
                <p className="font-medium">FR76 1695 8000 0187 9696 3374 445</p>
              </div>
              <div>
                <p className="text-gray-600">Référence</p>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>Vaya, SAS</p>
            <p>{invoice.invoice_number} · Page 1/1</p>
          </div>
        </CardContent>
      </Card>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .invoice-document {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceDetail;