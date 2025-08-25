import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const RESEND_API_KEY = 're_GSVAQXzX_A5xfyesXgNm7ghdweqpeVM3B'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { 
      memberEmail, 
      memberName, 
      clientName, 
      clientId,
      memberId,
      jobTitle 
    } = await req.json()

    if (!memberEmail || !memberName || !clientName || !memberId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      throw updateError
    }

    // URL d'inscription avec le token
    const signupUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://egdelmcijszuapcpglsy.supabase.co'}/register?invitation=${invitationToken}&type=team_member`

    // Préparer l'email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invitation à rejoindre l'équipe</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f7f7f7;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 30px;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              margin: 20px 0;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bienvenue dans l'équipe!</h1>
          </div>
          <div class="content">
            <p>Bonjour ${memberName},</p>
            
            <p><strong>${clientName}</strong> vous a invité à rejoindre son équipe sur notre plateforme de gestion de projets.</p>
            
            <div class="info-box">
              <h3>Vos informations</h3>
              <p><strong>Rôle:</strong> ${jobTitle || 'Membre d\'équipe'}</p>
              <p><strong>Entreprise:</strong> ${clientName}</p>
              <p><strong>Email:</strong> ${memberEmail}</p>
            </div>
            
            <p>Pour accepter cette invitation et créer votre compte, cliquez sur le bouton ci-dessous:</p>
            
            <div style="text-align: center;">
              <a href="${signupUrl}" class="button">Accepter l'invitation</a>
            </div>
            
            <p><small>Ou copiez et collez ce lien dans votre navigateur:</small><br>
            <small style="color: #667eea;">${signupUrl}</small></p>
            
            <h3>Que se passe-t-il ensuite?</h3>
            <ul>
              <li>Créez votre compte avec votre email</li>
              <li>Accédez automatiquement aux projets qui vous sont assignés</li>
              <li>Collaborez avec votre équipe en temps réel</li>
              <li>Suivez l'avancement des projets</li>
            </ul>
            
            <p><strong>Important:</strong> Ce lien d'invitation est unique et valable pendant 7 jours. Si vous avez des questions, contactez directement ${clientName}.</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé par la plateforme de gestion de projets.<br>
            © 2024 - Tous droits réservés</p>
          </div>
        </body>
      </html>
    `

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Team Invitations <onboarding@resend.dev>',
        to: [memberEmail],
        subject: `${clientName} vous invite à rejoindre son équipe`,
        html: emailHtml,
        text: `${clientName} vous a invité à rejoindre son équipe. Cliquez sur ce lien pour accepter l'invitation: ${signupUrl}`
      })
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const resendData = await resendResponse.json()

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation sent successfully',
      emailId: resendData.id,
      invitationToken
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})