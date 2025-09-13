import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51P94oUGMzVpQMQaDPvS7LMpnCbli48UhUR8FXuvi79EszEya3sFL1VZltarPRPPIUybgWIfw6OMjct5pztmEVra400a1PUL1cI';
// Disable Stripe in development to avoid HTTPS requirement
const stripePromise = window.location.protocol === 'https:' 
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

interface StripePaymentProps {
  invoice?: Invoice;
  invoiceData?: {
    project_id: string;
    total_cents: number;
    period_start: string;
    period_end: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StripePayment = ({ invoice, invoiceData, isOpen, onClose, onSuccess }: StripePaymentProps) => {
  const { formatCurrency, markInvoiceAsPaid } = useInvoices();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get project info if we only have invoiceData
  const [projectInfo, setProjectInfo] = useState<any>(null);
  
  // Load project info if needed
  useState(() => {
    if (invoiceData && !invoice) {
      supabase
        .from('projects')
        .select('id, title')
        .eq('id', invoiceData.project_id)
        .single()
        .then(({ data }) => {
          if (data) setProjectInfo(data);
        });
    }
  });

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setPaymentStatus('processing');
      setErrorMessage('');

      // Create payment intent via Edge Function
      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          invoiceId: invoice.id,
          amount: invoice.total_cents,
          currency: 'eur',
          description: `Facture ${invoice.invoice_number} - ${invoice.project?.title}`
        }
      });

      if (error) throw error;

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // Redirect to Stripe Checkout or use Payment Element
      if (data?.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } else if (data?.clientSecret) {
        // Use Payment Element (embedded checkout)
        // This would require additional UI components
        console.log('Payment intent created:', data.clientSecret);
        
        // For demo purposes, we'll simulate a successful payment
        setTimeout(async () => {
          await markInvoiceAsPaid(invoice.id, 'stripe');
          setPaymentStatus('success');
          toast.success('Paiement effectué avec succès');
          
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 2000);
        }, 3000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      setErrorMessage('Une erreur est survenue lors du paiement. Veuillez réessayer.');
      toast.error('Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Demo mode - simulate payment without real Stripe integration
  const handleDemoPayment = async () => {
    try {
      setIsProcessing(true);
      setPaymentStatus('processing');
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark invoice as paid if it exists
      if (invoice?.id) {
        await markInvoiceAsPaid(invoice.id, 'stripe');
      } else if (invoiceData) {
        // Save payment to invoice_payments table
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Calculate amounts
          const totalCents = invoiceData.total_cents;
          const subtotalCents = Math.round(totalCents / 1.20);
          const vatCents = totalCents - subtotalCents;
          
          // Try to save payment record (table might not exist yet)
          try {
            // Check if payment already exists
            const { data: existingPayment, error: checkError } = await supabase
              .from('invoice_payments')
              .select('id')
              .eq('project_id', invoiceData.project_id)
              .eq('period_start', invoiceData.period_start)
              .eq('period_end', invoiceData.period_end)
              .single();
            
            if (checkError && !checkError.message.includes('not found')) {
              // Table doesn't exist, skip saving payment
              console.log('Note: invoice_payments table not available yet');
            } else if (!existingPayment) {
              // Create new payment record
              const { error: paymentError } = await supabase
                .from('invoice_payments')
                .insert({
                  project_id: invoiceData.project_id,
                  period_start: invoiceData.period_start,
                  period_end: invoiceData.period_end,
                  total_cents: totalCents,
                  subtotal_cents: subtotalCents,
                  vat_cents: vatCents,
                  payment_method: 'stripe',
                  payment_status: 'paid',
                  client_id: userData.user.id
                });
              
              if (paymentError) {
                console.log('Note: Could not save payment record:', paymentError.message);
                // Continue anyway for demo mode
              } else {
                console.log('Payment saved successfully');
              }
            } else {
              console.log('Payment already exists for this period');
            }
          } catch (err) {
            console.log('Note: Could not save payment record');
          }
        }
      }
      
      setPaymentStatus('success');
      toast.success('Paiement effectué avec succès');
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      setErrorMessage('Une erreur est survenue');
      toast.error('Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement de la facture</DialogTitle>
          <DialogDescription>
            {invoice ? `Facture ${invoice.invoice_number}` : 'Facture hebdomadaire'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Projet</span>
                  <span className="font-medium">
                    {invoice ? invoice.project?.title : projectInfo?.title || 'Chargement...'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Période</span>
                  <span className="font-medium">
                    {invoice ? (
                      <>
                        {new Date(invoice.period_start).toLocaleDateString('fr-FR')} - 
                        {new Date(invoice.period_end).toLocaleDateString('fr-FR')}
                      </>
                    ) : invoiceData ? (
                      <>
                        {new Date(invoiceData.period_start).toLocaleDateString('fr-FR')} - 
                        {new Date(invoiceData.period_end).toLocaleDateString('fr-FR')}
                      </>
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant HT</span>
                  <span>
                    {invoice 
                      ? formatCurrency(invoice.subtotal_cents)
                      : invoiceData 
                        ? formatCurrency(Math.round(invoiceData.total_cents / 1.20))
                        : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA (20%)</span>
                  <span>
                    {invoice 
                      ? formatCurrency(invoice.vat_amount_cents)
                      : invoiceData 
                        ? formatCurrency(Math.round(invoiceData.total_cents - (invoiceData.total_cents / 1.20)))
                        : 'N/A'}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total TTC</span>
                  <span className="font-semibold text-lg text-purple-600">
                    {invoice 
                      ? formatCurrency(invoice.total_cents)
                      : invoiceData 
                        ? formatCurrency(invoiceData.total_cents)
                        : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment status */}
          {paymentStatus === 'success' && (
            <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="font-semibold text-green-800">Paiement réussi !</p>
                <p className="text-sm text-green-600">La facture a été marquée comme payée.</p>
              </div>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="flex items-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mr-3" />
              <p className="text-gray-600">Traitement du paiement en cours...</p>
            </div>
          )}

          {/* Payment buttons */}
          {paymentStatus === 'idle' && (
            <div className="space-y-3">
              <Button
                onClick={handleDemoPayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer {formatCurrency(invoice?.total_cents || invoiceData?.total_cents || 0)}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Mode démo - Paiement simulé sans transaction réelle
              </p>
              
              {/* Real Stripe button (commented for demo) */}
              {/* <Button
                onClick={handlePayment}
                disabled={isProcessing}
                variant="outline"
                className="w-full"
              >
                Payer avec Stripe (Production)
              </Button> */}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};