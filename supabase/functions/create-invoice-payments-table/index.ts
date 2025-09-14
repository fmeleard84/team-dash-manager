import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    console.log('🔧 Creating invoice_payments table...')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Check if table exists
      const checkTable = await client.queryObject(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'invoice_payments'
        );
      `)
      
      if (checkTable.rows[0].exists) {
        console.log('✅ Table invoice_payments already exists')
        await client.end()
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Table invoice_payments already exists'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      // Create table
      await client.queryArray(`
        CREATE TABLE public.invoice_payments (
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
          
          UNIQUE(project_id, period_start, period_end)
        )
      `)
      console.log('✅ Table created')

      // Create indexes
      await client.queryArray('CREATE INDEX idx_invoice_payments_project_id ON public.invoice_payments(project_id)')
      await client.queryArray('CREATE INDEX idx_invoice_payments_client_id ON public.invoice_payments(client_id)')
      await client.queryArray('CREATE INDEX idx_invoice_payments_period ON public.invoice_payments(period_start, period_end)')
      console.log('✅ Indexes created')

      // Enable RLS
      await client.queryArray('ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY')
      
      // Create RLS policies
      await client.queryArray(`
        CREATE POLICY "Clients can view own payments" ON public.invoice_payments
        FOR SELECT
        USING (auth.uid() = client_id)
      `)
      
      await client.queryArray(`
        CREATE POLICY "Clients can create payments" ON public.invoice_payments
        FOR INSERT
        WITH CHECK (
          auth.uid() = client_id
          AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_id
            AND projects.owner_id = auth.uid()
          )
        )
      `)
      
      console.log('✅ RLS policies created')

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Table invoice_payments created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } catch (error) {
      await client.end()
      throw error
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
