import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, firstName, lastName, phone, companyName, role } = await req.json()

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ message: 'Champs requis manquants' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ message: 'Le mot de passe doit faire au moins 6 caractères' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: 'Cet email est déjà utilisé' }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password)

    // Create user
    const { data: newUser, error: userError } = await supabaseClient
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        company_name: companyName || null,
        role: role,
        email_verified: false // In production, send verification email
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return new Response(
        JSON.stringify({ message: 'Erreur lors de la création du compte' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte créé avec succès' 
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ message: 'Erreur serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})