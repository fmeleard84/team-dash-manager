import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoicePaymentsTable() {
  try {
    console.log('Checking if invoice_payments table exists...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('invoice_payments')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Table invoice_payments does not exist');
        console.log('Creating table...');
        
        // Table doesn't exist, let's create it using raw SQL
        const { error: createError } = await supabase.rpc('exec_sql', {
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
          `
        });
        
        if (createError) {
          console.error('Error creating table:', createError);
        } else {
          console.log('✅ Table created successfully!');
        }
      } else {
        console.error('Error checking table:', error);
      }
    } else {
      console.log('✅ Table invoice_payments exists');
      console.log('Sample data:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkInvoicePaymentsTable();