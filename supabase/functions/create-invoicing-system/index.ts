import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating invoicing system tables...');

    // Create tables
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create invoices table
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          invoice_number TEXT UNIQUE NOT NULL,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES profiles(id),
          
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
          
          subtotal_cents INTEGER NOT NULL DEFAULT 0,
          vat_rate DECIMAL(5,2) DEFAULT 20.00,
          vat_amount_cents INTEGER NOT NULL DEFAULT 0,
          total_cents INTEGER NOT NULL DEFAULT 0,
          
          payment_method TEXT,
          payment_date TIMESTAMP WITH TIME ZONE,
          stripe_payment_intent_id TEXT,
          stripe_invoice_id TEXT,
          
          issued_date DATE DEFAULT CURRENT_DATE,
          due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
          notes TEXT,
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error1) {
      console.error('Error creating invoices table:', error1);
    }

    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create invoice_items table
        CREATE TABLE IF NOT EXISTS invoice_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          candidate_id UUID NOT NULL REFERENCES profiles(id),
          
          service_name TEXT NOT NULL,
          service_description TEXT,
          
          total_minutes INTEGER NOT NULL DEFAULT 0,
          rate_per_minute_cents INTEGER NOT NULL,
          amount_cents INTEGER NOT NULL,
          
          task_details JSONB DEFAULT '[]'::jsonb,
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error2) {
      console.error('Error creating invoice_items table:', error2);
    }

    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create company_info table
        CREATE TABLE IF NOT EXISTS company_info (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_name TEXT DEFAULT 'Ialla',
          address_line1 TEXT DEFAULT '6 rue de Verdun',
          address_line2 TEXT,
          postal_code TEXT DEFAULT '13280',
          city TEXT DEFAULT 'Rognes',
          country TEXT DEFAULT 'France',
          phone TEXT,
          email TEXT,
          siret TEXT,
          vat_number TEXT,
          logo_url TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insert default company info
        INSERT INTO company_info (id, company_name, address_line1, postal_code, city)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Ialla', '6 rue de Verdun', '13280', 'Rognes')
        ON CONFLICT (id) DO NOTHING;
      `
    });

    if (error3) {
      console.error('Error creating company_info table:', error3);
    }

    // Create sequence and functions
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create sequence for invoice numbering
        CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

        -- Function to generate invoice number
        CREATE OR REPLACE FUNCTION generate_invoice_number()
        RETURNS TEXT AS $$
        DECLARE
          current_year INTEGER;
          seq_number INTEGER;
        BEGIN
          current_year := EXTRACT(YEAR FROM CURRENT_DATE);
          seq_number := nextval('invoice_number_seq');
          RETURN format('INV-%s-%s', current_year, LPAD(seq_number::TEXT, 4, '0'));
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger to auto-generate invoice number
        CREATE OR REPLACE FUNCTION set_invoice_number()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.invoice_number IS NULL THEN
            NEW.invoice_number := generate_invoice_number();
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_invoice_number_trigger
          BEFORE INSERT ON invoices
          FOR EACH ROW
          EXECUTE FUNCTION set_invoice_number();
      `
    });

    if (error4) {
      console.error('Error creating functions:', error4);
    }

    // Create indexes
    const { error: error5 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
        CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);
        CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
        CREATE INDEX IF NOT EXISTS idx_invoice_items_candidate_id ON invoice_items(candidate_id);
      `
    });

    if (error5) {
      console.error('Error creating indexes:', error5);
    }

    // Enable RLS
    const { error: error6 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

        -- RLS Policies for invoices
        CREATE POLICY "Clients can view their own invoices" ON invoices
          FOR SELECT
          USING (client_id = auth.uid());

        CREATE POLICY "Admins can manage all invoices" ON invoices
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );

        -- RLS Policies for invoice_items
        CREATE POLICY "Users can view invoice items for their invoices" ON invoice_items
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM invoices
              WHERE invoices.id = invoice_items.invoice_id
              AND invoices.client_id = auth.uid()
            )
          );

        CREATE POLICY "Admins can manage all invoice items" ON invoice_items
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );

        -- RLS Policy for company_info
        CREATE POLICY "Anyone can view company info" ON company_info
          FOR SELECT
          USING (true);

        CREATE POLICY "Only admins can update company info" ON company_info
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
      `
    });

    if (error6) {
      console.error('Error enabling RLS:', error6);
    }

    // Enable realtime
    const { error: error7 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
        ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
      `
    });

    if (error7) {
      console.error('Error enabling realtime:', error7);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invoicing system created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});