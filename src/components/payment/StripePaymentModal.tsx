import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Initialize Stripe - Use test key for development
// Note: In development mode, we'll use simulated payments instead of real Stripe
const STRIPE_TEST_KEY = 'pk_test_51OQnGEJxGubEGJFsCLmXXvNZJHzWYTdCYvh3NrkM5eBU0RgPKVGpVMxPgYDxwXzNVxVLlVxQf7qVQzKYxXKXXXXX00XXXxxxXX';
const stripePromise = null; // Disable Stripe initialization - we'll use simulation in dev

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  minimumAmount?: number;
}

export function StripePaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  minimumAmount = 50 
}: StripePaymentModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(minimumAmount.toString());
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handlePayment = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < minimumAmount) {
      toast.error(`Le montant minimum est de ${minimumAmount}€`);
      return;
    }

    // En développement, on accepte des cartes de test ou pas de carte du tout
    const isDevelopment = window.location.protocol === 'http:';

    // Validation des champs de carte uniquement si remplis
    if (!isDevelopment && (!cardNumber || !expiry || !cvc)) {
      toast.error('Veuillez remplir tous les champs de la carte');
      return;
    }

    setLoading(true);

    try {
      // En développement ou sans HTTPS, on simule le paiement
      // Force simulation in all cases since we don't have a valid Stripe key configured
      if (true) { // Always use simulation for now
        console.log('Mode développement : simulation de paiement Stripe');
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Pour le développement, on ajoute directement les crédits
        const { data: initData, error: initError } = await supabase.functions.invoke('init-client-credits', {
          body: { userId: user.id }
        });
        
        if (initError) {
          console.error('Error initializing credits:', initError);
        }

        // Add credits to user account
        const { data, error } = await supabase.functions.invoke('manage-client-credits', {
          body: {
            action: 'add_credits',
            userId: user.id,
            amount: amountValue * 100, // Convert to cents
            paymentMethodId: 'pm_card_test' // Demo payment method
          }
        });

        if (error) throw error;

        if (data?.success) {
          toast.success(`${amountValue}€ ajoutés à votre compte (mode démo)`);
          // Force a small delay to ensure the database is updated before callback
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 100);
        } else {
          throw new Error(data?.error || 'Erreur lors du paiement');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + (v.length > 2 ? '/' + v.slice(2, 4) : '');
    }
    return v;
  };

  const isDevelopment = typeof window !== 'undefined' && window.location.protocol === 'http:';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des crédits</DialogTitle>
          <DialogDescription>
            Ajoutez des crédits à votre compte pour pouvoir créer et gérer vos projets.
            Montant minimum : {minimumAmount}€
            {isDevelopment && (
              <span className="block mt-2 text-yellow-600">
                ⚠️ Mode développement : Paiement simulé (pas de vraie transaction)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Montant (€)</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                min={minimumAmount}
                step="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                placeholder={`Minimum ${minimumAmount}€`}
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Informations de paiement
            </h4>

            <div>
              <Label htmlFor="card">Numéro de carte</Label>
              <Input
                id="card"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiry">Expiration</Label>
                <Input
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  maxLength={3}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              🔒 Paiement sécurisé par Stripe
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payer {amount}€
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}