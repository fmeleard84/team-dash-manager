-- ================================================
-- INVOICE SYSTEM TABLES
-- ================================================
-- System for weekly invoicing of client projects
-- ================================================

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL, -- Format: INV-2025-0001
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Invoice details
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Amounts (in cents to avoid floating point issues)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 20.00, -- VAT percentage
  vat_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Payment info
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Metadata
  issued_date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table for line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Service details
  service_name TEXT NOT NULL, -- e.g., "Gestion de projet", "Développement"
  service_description TEXT,
  
  -- Time and cost
  total_minutes INTEGER NOT NULL DEFAULT 0,
  rate_per_minute_cents INTEGER NOT NULL, -- Rate in cents per minute
  amount_cents INTEGER NOT NULL, -- total_minutes * rate_per_minute_cents
  
  -- Store task details as JSON for the detailed breakdown
  task_details JSONB DEFAULT '[]'::jsonb,
  /* Example task_details format:
  [
    {
      "description": "Mise en place architecture",
      "duration_minutes": 25,
      "date": "2025-01-15",
      "time_tracking_id": "uuid-reference"
    },
    ...
  ]
  */
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_info table for invoice header
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

-- Indexes for performance
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_candidate_id ON invoice_items(candidate_id);

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

-- Function to generate weekly invoices
CREATE OR REPLACE FUNCTION generate_weekly_invoice(
  p_project_id UUID,
  p_week_start DATE,
  p_week_end DATE
) RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_client_id UUID;
  v_subtotal INTEGER := 0;
  v_vat_amount INTEGER;
  v_total INTEGER;
BEGIN
  -- Get client ID from project
  SELECT COALESCE(owner_id, user_id) INTO v_client_id
  FROM projects
  WHERE id = p_project_id;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Project client not found';
  END IF;
  
  -- Create invoice
  INSERT INTO invoices (
    project_id,
    client_id,
    period_start,
    period_end,
    status
  ) VALUES (
    p_project_id,
    v_client_id,
    p_week_start,
    p_week_end,
    'draft'
  ) RETURNING id INTO v_invoice_id;
  
  -- Generate invoice items from time_tracking_records
  INSERT INTO invoice_items (
    invoice_id,
    candidate_id,
    service_name,
    total_minutes,
    rate_per_minute_cents,
    amount_cents,
    task_details
  )
  SELECT 
    v_invoice_id,
    ttr.candidate_id,
    COALESCE(cp.position, 'Consultant') as service_name,
    SUM(ttr.duration_minutes) as total_minutes,
    ROUND(ttr.hourly_rate * 100)::INTEGER as rate_per_minute_cents, -- Convert to cents
    ROUND(SUM(ttr.duration_minutes * ttr.hourly_rate) * 100)::INTEGER as amount_cents,
    jsonb_agg(
      jsonb_build_object(
        'description', ttr.activity_description,
        'duration_minutes', ttr.duration_minutes,
        'date', ttr.date,
        'time_tracking_id', ttr.id
      ) ORDER BY ttr.date, ttr.created_at
    ) as task_details
  FROM time_tracking_records ttr
  LEFT JOIN candidate_profiles cp ON cp.id = ttr.candidate_id
  WHERE ttr.project_id = p_project_id
    AND ttr.date >= p_week_start
    AND ttr.date <= p_week_end
  GROUP BY ttr.candidate_id, cp.position, ttr.hourly_rate;
  
  -- Calculate totals
  SELECT SUM(amount_cents) INTO v_subtotal
  FROM invoice_items
  WHERE invoice_id = v_invoice_id;
  
  -- Calculate VAT (20% by default)
  v_vat_amount := ROUND(v_subtotal * 0.20);
  v_total := v_subtotal + v_vat_amount;
  
  -- Update invoice with totals
  UPDATE invoices
  SET 
    subtotal_cents = COALESCE(v_subtotal, 0),
    vat_amount_cents = COALESCE(v_vat_amount, 0),
    total_cents = COALESCE(v_total, 0),
    updated_at = NOW()
  WHERE id = v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;