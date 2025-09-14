-- Create client_credits table to track client balance
CREATE TABLE IF NOT EXISTS public.client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create payment_history table to track all payments
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'stripe',
  invoice_url TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_client_credits_user_id ON public.client_credits(user_id);
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_date ON public.payment_history(payment_date DESC);

-- Enable RLS
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_credits
CREATE POLICY "Users can view own credits" ON public.client_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update credits" ON public.client_credits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for payment_history
CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert payments" ON public.payment_history
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;