import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  email: string;
  code: string;
  firstName: string;
}

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') || 'hello@vaya.rip';
const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') || 'Vaya Platform';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, firstName }: EmailRequest = await req.json();

    const emailData = {
      sender: {
        email: BREVO_FROM_EMAIL,
        name: BREVO_FROM_NAME
      },
      to: [
        {
          email: email,
          name: firstName
        }
      ],
      subject: "Vérification de votre compte Vaya",
      htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 8px; }
                .header { text-align: center; margin-bottom: 30px; }
                .code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 3px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="color: #1f2937;">Bienvenue ${firstName} !</h1>
                  <p style="color: #666;">Merci de vous être inscrit sur la plateforme Vaya.</p>
                </div>
                
                <div style="text-align: center;">
                  <p>Votre code de vérification est :</p>
                  <div class="code">${code}</div>
                  <p style="color: #666; font-size: 14px;">Ce code expire dans 15 minutes.</p>
                </div>
                
                <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>Important :</strong> Si vous n'avez pas demandé cette vérification, ignorez cet email.
                  </p>
                </div>
                
                <div class="footer">
                  <p>Équipe Vaya<br>
                  <a href="mailto:hello@vaya.rip" style="color: #2563eb;">hello@vaya.rip</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
      textContent: `
            Bonjour ${firstName},
            
            Bienvenue sur notre plateforme de ressources !
            
            Votre code de vérification est : ${code}
            
            Ce code expire dans 15 minutes.
            
            Si vous n'avez pas demandé cette vérification, ignorez cet email.
            
            Équipe Vaya
            hello@vaya.rip
          `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Brevo error:', result);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    console.log('Email sent successfully:', result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email de vérification envoyé' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-verification-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});