import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') || 'hello@vaya.rip';
const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') || 'Vaya Platform';

interface EmailRequest {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  params?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    const data: EmailRequest = await req.json();

    // Préparer les destinataires
    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    const to = recipients.map(email => ({ email, name: email.split('@')[0] }));

    // Envoyer avec Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_FROM_NAME,
          email: BREVO_FROM_EMAIL
        },
        to: to,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent || data.htmlContent.replace(/<[^>]*>/g, ''),
        params: data.params
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email envoyé avec Brevo:', result);
      return new Response(
        JSON.stringify({ success: true, provider: 'brevo', messageId: result.messageId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      const error = await response.json();
      console.error('❌ Erreur Brevo:', error);
      throw new Error(error.message || 'Erreur envoi email');
    }

  } catch (error) {
    console.error('Error in send-email-brevo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
