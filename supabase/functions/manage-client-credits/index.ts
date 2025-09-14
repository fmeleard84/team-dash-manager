import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Stripe with environment variable
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, userId, amount, paymentMethodId } = await req.json()

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (action) {
      case 'check_balance': {
        // Get current balance
        const { data, error } = await supabase
          .from('client_credits')
          .select('balance_cents')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error
        }

        const balance = data?.balance_cents || 0

        return new Response(
          JSON.stringify({ balance_cents: balance }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'add_credits': {
        try {
          // For demo mode with test payment method
          if (paymentMethodId === 'pm_card_test') {
            console.log('Demo mode: simulating payment success')

            // Check if user already has credits record
            const { data: existingCredits } = await supabase
              .from('client_credits')
              .select('balance_cents')
              .eq('user_id', userId)
              .single()

            if (existingCredits) {
              // Update existing credits
              const { data: updatedCredits, error: updateError } = await supabase
                .from('client_credits')
                .update({
                  balance_cents: existingCredits.balance_cents + amount,
                  last_updated: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select('balance_cents')
                .single()

              if (updateError) throw updateError

              // Record payment
              const { error: paymentError } = await supabase
                .from('payment_history')
                .insert({
                  user_id: userId,
                  amount_cents: amount,
                  stripe_payment_id: 'demo_' + Date.now(),
                  payment_status: 'succeeded',
                  payment_date: new Date().toISOString()
                })

              if (paymentError) {
                console.error('Error recording payment:', paymentError)
              }

              return new Response(
                JSON.stringify({
                  success: true,
                  payment_id: 'demo_' + Date.now(),
                  new_balance: updatedCredits.balance_cents
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } else {
              // Create new credits record
              const { data: newCredits, error: insertError } = await supabase
                .from('client_credits')
                .insert({
                  user_id: userId,
                  balance_cents: amount,
                  last_updated: new Date().toISOString()
                })
                .select('balance_cents')
                .single()

              if (insertError) throw insertError

              // Record payment
              const { error: paymentError } = await supabase
                .from('payment_history')
                .insert({
                  user_id: userId,
                  amount_cents: amount,
                  stripe_payment_id: 'demo_' + Date.now(),
                  payment_status: 'succeeded',
                  payment_date: new Date().toISOString()
                })

              if (paymentError) {
                console.error('Error recording payment:', paymentError)
              }

              return new Response(
                JSON.stringify({
                  success: true,
                  payment_id: 'demo_' + Date.now(),
                  new_balance: newCredits.balance_cents
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            // Real Stripe payment
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount, // Amount in cents
              currency: 'eur',
              payment_method: paymentMethodId,
              confirm: true,
              automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
              },
              metadata: {
                user_id: userId
              }
            })

            if (paymentIntent.status === 'succeeded') {
              // Similar logic as demo mode but with real payment ID
              const { data: existingCredits } = await supabase
                .from('client_credits')
                .select('balance_cents')
                .eq('user_id', userId)
                .single()

              let newBalance = amount

              if (existingCredits) {
                const { data: updatedCredits, error: updateError } = await supabase
                  .from('client_credits')
                  .update({
                    balance_cents: existingCredits.balance_cents + amount,
                    last_updated: new Date().toISOString()
                  })
                  .eq('user_id', userId)
                  .select('balance_cents')
                  .single()

                if (updateError) throw updateError
                newBalance = updatedCredits.balance_cents
              } else {
                const { data: newCredits, error: insertError } = await supabase
                  .from('client_credits')
                  .insert({
                    user_id: userId,
                    balance_cents: amount,
                    last_updated: new Date().toISOString()
                  })
                  .select('balance_cents')
                  .single()

                if (insertError) throw insertError
                newBalance = newCredits.balance_cents
              }

              // Record payment
              await supabase
                .from('payment_history')
                .insert({
                  user_id: userId,
                  amount_cents: amount,
                  stripe_payment_id: paymentIntent.id,
                  payment_status: 'succeeded',
                  payment_date: new Date().toISOString()
                })

              return new Response(
                JSON.stringify({
                  success: true,
                  payment_id: paymentIntent.id,
                  new_balance: newBalance
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } else {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Payment failed'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }
          }
        } catch (error) {
          console.error('Error in add_credits:', error)
          throw error
        }
        }

      case 'deduct_credits': {
        // Get current balance
        const { data: currentCredits, error: fetchError } = await supabase
          .from('client_credits')
          .select('balance_cents')
          .eq('user_id', userId)
          .single()

        if (fetchError || !currentCredits) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Credits not found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        if (currentCredits.balance_cents < amount) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Insufficient credits'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        // Deduct credits
        const { data: updatedCredits, error: updateError } = await supabase
          .from('client_credits')
          .update({
            balance_cents: currentCredits.balance_cents - amount,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('balance_cents')
          .single()

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({
            success: true,
            new_balance: updatedCredits.balance_cents
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})