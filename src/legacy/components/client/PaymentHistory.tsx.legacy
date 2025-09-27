import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Download, Euro, Calendar, Receipt, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useClientCredits } from '@/hooks/useClientCredits';
import { StripePaymentModal } from '../payment/StripePaymentModal';

interface Payment {
  id: string;
  amount_cents: number;
  stripe_payment_id: string;
  payment_status: string;
  payment_method: string;
  invoice_url?: string;
  payment_date: string;
  created_at: string;
}

export function PaymentHistory() {
  const { user } = useAuth();
  const { balance, formatBalance, refreshBalance } = useClientCredits();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      initializeAndFetchHistory();
    }
  }, [user]);

  const initializeAndFetchHistory = async () => {
    // First ensure credits are initialized
    await refreshBalance();
    // Then fetch payment history
    await fetchPaymentHistory();
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        return;
      }

      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadInvoice = async (payment: Payment) => {
    setDownloadingInvoice(payment.id);
    
    try {
      // Generate invoice PDF (in a real app, this would call your backend)
      const invoiceData = {
        invoiceNumber: `INV-${payment.id.slice(0, 8).toUpperCase()}`,
        date: payment.payment_date,
        amount: payment.amount_cents / 100,
        paymentMethod: payment.payment_method,
        transactionId: payment.stripe_payment_id
      };

      // Create a simple HTML invoice
      const invoiceHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Facture ${invoiceData.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .invoice-details { margin-bottom: 30px; }
            .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .footer { margin-top: 50px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FACTURE</h1>
            <p>N° ${invoiceData.invoiceNumber}</p>
          </div>
          <div class="invoice-details">
            <p><strong>Date:</strong> ${formatDate(invoiceData.date)}</p>
            <p><strong>Montant:</strong> <span class="amount">${invoiceData.amount}€</span></p>
            <p><strong>Méthode de paiement:</strong> ${invoiceData.paymentMethod}</p>
            <p><strong>ID Transaction:</strong> ${invoiceData.transactionId}</p>
          </div>
          <div class="footer">
            <p>Merci pour votre paiement</p>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([invoiceHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceData.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Facture téléchargée');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solde actuel */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Solde actuel
            </span>
            <Button
              onClick={() => setShowPaymentModal(true)}
              variant="secondary"
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter des crédits
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatBalance()}</p>
          <p className="text-sm opacity-90 mt-2">
            Utilisez vos crédits pour créer des projets et booker des équipes
          </p>
        </CardContent>
      </Card>

      {/* Historique des paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement enregistré</p>
              <Button
                onClick={() => setShowPaymentModal(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Effectuer votre premier paiement
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{formatAmount(payment.amount_cents)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(payment.payment_date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={payment.payment_status === 'succeeded' ? 'default' : 'secondary'}
                      className={payment.payment_status === 'succeeded' ? 'bg-green-500' : ''}
                    >
                      {payment.payment_status === 'succeeded' ? 'Payé' : payment.payment_status}
                    </Badge>
                    
                    <Button
                      onClick={() => downloadInvoice(payment)}
                      variant="ghost"
                      size="sm"
                      disabled={downloadingInvoice === payment.id}
                    >
                      {downloadingInvoice === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de paiement */}
      <StripePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          refreshBalance();
          fetchPaymentHistory();
        }}
        minimumAmount={50}
      />
    </div>
  );
}