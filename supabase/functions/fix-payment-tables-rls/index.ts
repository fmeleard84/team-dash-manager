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
    console.log('🔧 Fixing payment tables and RLS...')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Drop existing policies if any
      await client.queryArray(`
        DROP POLICY IF EXISTS "Users can view own credits" ON client_credits;
        DROP POLICY IF EXISTS "System can update credits" ON client_credits;
        DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
        DROP POLICY IF EXISTS "System can insert payments" ON payment_history;
      `)
      console.log('✅ Old policies dropped')

      // Recreate RLS policies with proper permissions
      await client.queryArray(`
        -- Allow users to select their own credits
        CREATE POLICY "Users can view own credits" ON public.client_credits
          FOR SELECT
          USING (auth.uid() = user_id);
          
        -- Allow users to insert their own credits if they don't exist
        CREATE POLICY "Users can insert own credits" ON public.client_credits
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        -- Allow users to update their own credits
        CREATE POLICY "Users can update own credits" ON public.client_credits
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
      `)
      console.log('✅ client_credits policies created')

      await client.queryArray(`
        -- Allow users to view their own payment history
        CREATE POLICY "Users can view own payment history" ON public.payment_history
          FOR SELECT
          USING (auth.uid() = user_id);
          
        -- Allow users to insert their own payments
        CREATE POLICY "Users can insert own payments" ON public.payment_history
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
      `)
      console.log('✅ payment_history policies created')

      // Grant necessary permissions
      await client.queryArray(`
        GRANT ALL ON public.client_credits TO authenticated;
        GRANT ALL ON public.payment_history TO authenticated;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      `)
      console.log('✅ Permissions granted')

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment tables RLS fixed successfully'
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