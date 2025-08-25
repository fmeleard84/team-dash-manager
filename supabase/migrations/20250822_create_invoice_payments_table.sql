-- Create invoice_payments table to track payments
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_cents INTEGER NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  vat_cents INTEGER NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT DEFAULT 'stripe',
  payment_status TEXT DEFAULT 'paid',
  stripe_payment_id TEXT,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique payment per project and period
  UNIQUE(project_id, period_start, period_end)
);

-- Create index for quick lookups
CREATE INDEX idx_invoice_payments_project_id ON public.invoice_payments(project_id);
CREATE INDEX idx_invoice_payments_client_id ON public.invoice_payments(client_id);
CREATE INDEX idx_invoice_payments_period ON public.invoice_payments(period_start, period_end);

-- Enable RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Clients can view their own payments
CREATE POLICY "Clients can view own payments" ON public.invoice_payments
  FOR SELECT
  USING (auth.uid() = client_id);

-- Clients can create payments for their projects
CREATE POLICY "Clients can create payments" ON public.invoice_payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Candidates can view payments for projects they're assigned to
CREATE POLICY "Candidates can view project payments" ON public.invoice_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hr_resource_assignments
      WHERE hr_resource_assignments.project_id = invoice_payments.project_id
      AND hr_resource_assignments.assigned_resource_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_payments;