import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useClientCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch current balance
  const fetchBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('client_credits')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record exists, initialize it
          console.log('Initializing credits for user...');
          const { data: initData, error: initError } = await supabase.functions.invoke('init-client-credits', {
            body: { userId: user.id }
          });
          
          if (initError) {
            console.error('Error initializing credits:', initError);
          } else {
            setBalance(initData?.balance_cents || 0);
          }
        } else {
          console.error('Error fetching balance:', error);
        }
      } else {
        setBalance(data?.balance_cents || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has sufficient credits
  const hasMinimumCredits = (minimumCents: number = 5000) => {
    return balance >= minimumCents;
  };

  // Format balance for display
  const formatBalance = () => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(balance / 100);
  };

  // Check credits and show popup if insufficient
  const checkCreditsForAction = (actionName: string, minimumCents: number = 5000) => {
    if (!hasMinimumCredits(minimumCents)) {
      return {
        success: false,
        message: `Crédit insuffisant. Minimum requis: ${minimumCents / 100}€. Votre solde: ${formatBalance()}`
      };
    }
    return { success: true };
  };

  // Deduct credits for an action
  const deductCredits = async (amount: number) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const response = await supabase.functions.invoke('manage-client-credits', {
        body: {
          action: 'deduct_credits',
          userId: user.id,
          amount: amount
        }
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.success) {
        setBalance(response.data.new_balance);
        return { success: true, new_balance: response.data.new_balance };
      }

      return { success: false, error: response.data?.error || 'Failed to deduct credits' };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return { success: false, error: 'Failed to deduct credits' };
    }
  };

  useEffect(() => {
    fetchBalance();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('client_credits')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_credits',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        console.log('Credit balance updated via real-time');
        fetchBalance();
      })
      .subscribe();

    // Also subscribe to payment_history for immediate updates
    const paymentSubscription = supabase
      .channel('payment_history')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_history',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        console.log('New payment detected, refreshing balance');
        fetchBalance();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      paymentSubscription.unsubscribe();
    };
  }, [user]);

  return {
    balance,
    loading,
    hasMinimumCredits,
    formatBalance,
    checkCreditsForAction,
    deductCredits,
    refreshBalance: fetchBalance
  };
}