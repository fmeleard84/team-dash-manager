import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = 're_GSVAQXzX_A5xfyesXgNm7ghdweqpeVM3B'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      memberEmail, 
      memberName, 
      clientName, 
      clientId,
      memberId,
      jobTitle 
    } = await req.json()

    console.log('Received invitation request:', { memberEmail, memberName, jobTitle })

    if (!memberEmail || !memberName || !memberId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Générer un token d'invitation unique
    const invitationToken = crypto.randomUUID()
    
    // Stocker le token dans la table client_team_members
    const { error: updateError } = await supabase
      .from('client_team_members')
      .update({
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString()
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error updating invitation token:', updateError)
    }

    // URL d'inscription avec le token
    const baseUrl = 'https://teamdash.ialla.fr' // Production URL with ialla.fr domain
    const signupUrl = `${baseUrl}/register?invitation=${invitationToken}&type=team_member`

    // Préparer l'email HTML professionnel
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invitation à rejoindre l'équipe - Ialla</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Bienvenue dans l'équipe !</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 16px;">Ialla - Plateforme de gestion d'équipes</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Bonjour ${memberName},</p>
              
              <p style="font-size: 15px; line-height: 1.6; color: #555; margin: 0 0 25px 0;">
                <strong style="color: #333;">${clientName}</strong> vous a invité à rejoindre son équipe sur Ialla, 
                notre plateforme de gestion de projets et d'équipes.
              </p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; border-radius: 4px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Vos informations</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #666;">Rôle :</td>
                    <td style="padding: 5px 0; color: #333; font-weight: 500;">${jobTitle || 'Membre d\'équipe'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;">Entreprise :</td>
                    <td style="padding: 5px 0; color: #333; font-weight: 500;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;">Email :</td>
                    <td style="padding: 5px 0; color: #333; font-weight: 500;">${memberEmail}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 15px; line-height: 1.6; color: #555; margin: 25px 0;">
                Pour accepter cette invitation et créer votre compte, cliquez sur le bouton ci-dessous :
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Accepter l'invitation
                </a>
              </div>
              
              <div style="background: #fefefe; border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; margin: 25px 0;">
                <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                </p>
                <p style="font-size: 12px; color: #667eea; margin: 0; word-break: break-all;">
                  ${signupUrl}
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <h4 style="color: #333; font-size: 14px; margin: 0 0 10px 0;">Prochaines étapes :</h4>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #555; font-size: 14px; line-height: 1.8;">
                  <li>Créez votre compte avec votre email</li>
                  <li>Accédez automatiquement aux projets assignés</li>
                  <li>Collaborez avec votre équipe en temps réel</li>
                  <li>Suivez l'avancement des projets</li>
                </ul>
              </div>
              
              <p style="font-size: 13px; color: #999; margin: 25px 0 0 0; padding: 15px; background: #fafafa; border-radius: 4px;">
                ⚠️ <strong>Important :</strong> Ce lien d'invitation est unique et valable pendant 7 jours. 
                Si vous avez des questions, contactez directement ${clientName}.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                © 2024 Ialla - Plateforme de gestion d'équipes<br>
                <a href="https://ialla.fr" style="color: #667eea; text-decoration: none;">www.ialla.fr</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Envoyer l'email via Resend
    console.log('Sending email via Resend to:', memberEmail)
    
    // Configuration pour l'envoi d'email
    let fromEmail = 'Team Invitations <onboarding@resend.dev>'; // Default for testing
    let toEmail = memberEmail;
    
    // Vérifier si le domaine ialla.fr est configuré
    // Une fois les DNS propagés, utiliser: from: 'noreply@ialla.fr'
    // Pour l'instant, on garde le domaine de test
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `${clientName} vous invite à rejoindre son équipe sur Ialla`,
        html: emailHtml,
        text: `${clientName} vous a invité à rejoindre son équipe sur Ialla. Cliquez sur ce lien pour accepter l'invitation: ${signupUrl}`
      })
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      console.error('Resend API error:', error)
      console.error('Response status:', resendResponse.status)
      
      // Try with verified email if domain not ready
      if (error.includes('domain') || error.includes('verify')) {
        console.log('Domain not ready, email invitation link generated but not sent')
        return new Response(JSON.stringify({
          success: true,
          message: 'Invitation created (email pending domain verification)',
          invitationToken,
          invitationUrl: signupUrl,
          note: 'Domain verification pending. Share this link manually.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Return success anyway - member was created
      return new Response(JSON.stringify({
        success: true,
        message: 'Member created, invitation link generated',
        invitationToken,
        invitationUrl: signupUrl,
        emailError: error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully:', resendData)

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation sent successfully',
      emailId: resendData.id,
      invitationToken,
      invitationUrl: signupUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-team-member-invite:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})