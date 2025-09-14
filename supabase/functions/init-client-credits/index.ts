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
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Check if user already has credits record
      const checkResult = await client.queryObject(`
        SELECT id, balance_cents 
        FROM client_credits
        WHERE user_id = $1
      `, [userId])
      
      if (checkResult.rows.length > 0) {
        // User already has credits
        await client.end()
        return new Response(
          JSON.stringify({ 
            success: true,
            balance_cents: checkResult.rows[0].balance_cents,
            message: 'Credits already initialized'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Initialize credits for new user with 0 balance
      await client.queryArray(`
        INSERT INTO client_credits (user_id, balance_cents)
        VALUES ($1, 0)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId])
      
      console.log(`✅ Initialized credits for user ${userId}`)
      
      await client.end()
      return new Response(
        JSON.stringify({ 
          success: true,
          balance_cents: 0,
          message: 'Credits initialized successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      await client.end()
      throw error
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})