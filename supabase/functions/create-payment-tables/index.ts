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
    console.log('🔧 Creating payment tables...')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Create client_credits table
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS public.client_credits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          balance_cents INTEGER NOT NULL DEFAULT 0,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(user_id)
        )
      `)
      console.log('✅ client_credits table created')

      // Create payment_history table
      await client.queryArray(`
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
        )
      `)
      console.log('✅ payment_history table created')

      // Create indexes
      await client.queryArray('CREATE INDEX IF NOT EXISTS idx_client_credits_user_id ON public.client_credits(user_id)')
      await client.queryArray('CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id)')
      await client.queryArray('CREATE INDEX IF NOT EXISTS idx_payment_history_date ON public.payment_history(payment_date DESC)')
      console.log('✅ Indexes created')

      // Enable RLS
      await client.queryArray('ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY')
      await client.queryArray('ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY')
      
      // Create RLS policies for client_credits
      await client.queryArray(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'client_credits' 
            AND policyname = 'Users can view own credits'
          ) THEN
            CREATE POLICY "Users can view own credits" ON public.client_credits
              FOR SELECT
              USING (auth.uid() = user_id);
          END IF;
        END $$;
      `)

      // Create RLS policies for payment_history
      await client.queryArray(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'payment_history' 
            AND policyname = 'Users can view own payment history'
          ) THEN
            CREATE POLICY "Users can view own payment history" ON public.payment_history
              FOR SELECT
              USING (auth.uid() = user_id);
          END IF;
        END $$;
      `)
      
      console.log('✅ RLS policies created')

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment tables created successfully'
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