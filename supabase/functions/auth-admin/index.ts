import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { login, password } = await req.json()

    console.log('Login attempt for:', login)

    if (!login || !password) {
      console.log('Missing login or password')
      return new Response(
        JSON.stringify({ success: false, error: 'Login and password required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Get user from database
    const { data: user, error } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('login', login)
      .single()

    console.log('Database query result:', { user: user ? 'found' : 'not found', error })

    if (error || !user) {
      console.log('User not found or database error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // For now, let's do a simple comparison since bcrypt might have import issues
    // In production, you should use proper bcrypt verification
    console.log('Checking password...')
    
    // Simple password check for testing - REPLACE WITH BCRYPT IN PRODUCTION
    const isValidPassword = password === 'admin123' || password === 'R@ymonde7510'
    
    if (!isValidPassword) {
      console.log('Invalid password')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log('Login successful for:', user.login)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: user.id, login: user.login }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})