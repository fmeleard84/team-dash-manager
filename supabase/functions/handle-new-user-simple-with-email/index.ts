import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookData = await req.json()
    console.log('Webhook received:', JSON.stringify(webhookData, null, 2))

    const { id, email, email_confirmed_at, raw_user_meta_data } = webhookData.record

    // Configuration pour PRODUCTION
    const supabaseUrl = 'https://nlesrzepybeeghghjafc.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extraire les informations de l'utilisateur
    const userType = raw_user_meta_data?.user_type || 'candidate'
    const firstName = raw_user_meta_data?.first_name || ''
    const lastName = raw_user_meta_data?.last_name || ''

    console.log(`Processing new ${userType}: ${email}`)

    // 1. Créer le profil principal
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: userType,
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      throw profileError
    }

    console.log('Profile created successfully')

    // 2. Créer le profil spécifique selon le type
    if (userType === 'candidate') {
      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .insert({
          id,
          email,
          first_name: firstName,
          last_name: lastName,
          status: 'qualification',
          qualification_status: 'pending',
          created_at: new Date().toISOString()
        })

      if (candidateError) {
        console.error('Error creating candidate profile:', candidateError)
        throw candidateError
      }

      console.log('Candidate profile created successfully')
    } else if (userType === 'client') {
      const { error: clientError } = await supabase
        .from('client_profiles')
        .insert({
          id,
          email,
          first_name: firstName,
          last_name: lastName,
          created_at: new Date().toISOString()
        })

      if (clientError) {
        console.error('Error creating client profile:', clientError)
        throw clientError
      }

      console.log('Client profile created successfully')
    }

    // 3. Si l'email n'est pas confirmé, envoyer l'email via Brevo
    if (!email_confirmed_at) {
      console.log('Email not confirmed, sending verification email via Brevo')

      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
      const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') || 'hello@vaya.rip'
      const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') || 'La Team Vaya'

      if (!BREVO_API_KEY) {
        console.error('BREVO_API_KEY not set, cannot send email')
      } else {
        // Générer un token de confirmation
        const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: email,
        })

        if (tokenError) {
          console.error('Error generating confirmation link:', tokenError)
        } else {
          // Extraire le token de l'URL
          const confirmUrl = tokenData.properties?.action_link || ''

          // Remplacer l'URL de base par vaya.rip
          const prodUrl = confirmUrl.replace(
            /https?:\/\/[^\/]+/,
            'https://vaya.rip'
          )

          const emailData = {
            sender: {
              email: BREVO_FROM_EMAIL,
              name: BREVO_FROM_NAME
            },
            to: [{
              email: email,
              name: `${firstName} ${lastName}`.trim() || email
            }],
            subject: "Confirmez votre inscription sur Vaya",
            htmlContent: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; }
                  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                  .header { text-align: center; margin-bottom: 30px; }
                  .logo { font-size: 32px; font-weight: bold; color: #8B5CF6; }
                  .button { display: inline-block; padding: 14px 30px; background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">VAYA</div>
                    <h1 style="color: #1f2937;">Bienvenue ${firstName} !</h1>
                  </div>

                  <p>Merci de vous être inscrit sur Vaya, la plateforme collaborative pour les projets innovants.</p>

                  <p>Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>

                  <div style="text-align: center;">
                    <a href="${prodUrl}" class="button">Confirmer mon inscription</a>
                  </div>

                  <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur :</p>
                  <p style="word-break: break-all; color: #8B5CF6; font-size: 12px;">${prodUrl}</p>

                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                  <p style="color: #666; font-size: 14px;">
                    Si vous n'avez pas créé de compte sur Vaya, vous pouvez ignorer cet email.
                  </p>

                  <div class="footer">
                    <p>© 2025 Vaya - Tous droits réservés<br>
                    <a href="https://vaya.rip" style="color: #8B5CF6;">vaya.rip</a> |
                    <a href="mailto:hello@vaya.rip" style="color: #8B5CF6;">hello@vaya.rip</a></p>
                  </div>
                </div>
              </body>
              </html>
            `,
            textContent: `
              Bienvenue ${firstName} !

              Merci de vous être inscrit sur Vaya.

              Pour activer votre compte, cliquez sur ce lien :
              ${prodUrl}

              Si vous n'avez pas créé de compte sur Vaya, vous pouvez ignorer cet email.

              L'équipe Vaya
              hello@vaya.rip
            `
          }

          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData),
          })

          const result = await response.json()

          if (!response.ok) {
            console.error('Brevo error:', result)
          } else {
            console.log('Confirmation email sent successfully via Brevo')
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${userType} profile created successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})