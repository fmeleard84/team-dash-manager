import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create the invoice_payments table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_invoice_payments_project_id ON public.invoice_payments(project_id);
        CREATE INDEX IF NOT EXISTS idx_invoice_payments_client_id ON public.invoice_payments(client_id);
        CREATE INDEX IF NOT EXISTS idx_invoice_payments_period ON public.invoice_payments(period_start, period_end);

        -- Enable RLS
        ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Clients can view own payments" ON public.invoice_payments;
        DROP POLICY IF EXISTS "Clients can create payments" ON public.invoice_payments;
        DROP POLICY IF EXISTS "Candidates can view project payments" ON public.invoice_payments;

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
      `
    })

    if (createTableError) {
      throw createTableError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice payments table created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})