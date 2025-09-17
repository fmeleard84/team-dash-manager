import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') || 'hello@vaya.rip';
const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') || 'Vaya Platform';

interface ValidationEmailRequest {
  to: string;
  subject: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  profile: string;
  seniority: string;
  languages: string[];
  expertises: string[];
  score: number;
  answers: any[];
  testDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: ValidationEmailRequest = await req.json();

    console.log(`📧 Envoi email validation pour ${data.candidateName} (Score: ${data.score}%)`);

    // Créer le contenu HTML de l'email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .score-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-size: 24px; font-weight: bold; }
    .score-medium { background: #ffc107; color: #000; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: white; padding: 15px; border-radius: 5px; }
    .info-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .info-value { font-size: 16px; margin-top: 5px; }
    .answers-section { margin-top: 30px; }
    .answer-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .question { font-weight: bold; color: #333; margin-bottom: 10px; }
    .answer { color: #666; }
    .action-buttons { margin: 30px 0; text-align: center; }
    .btn { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .btn-approve { background: #28a745; color: white; }
    .btn-reject { background: #dc3545; color: white; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Validation Manuelle Requise</h1>
      <p>Un candidat a obtenu un score entre 60% et 89% et nécessite une validation manuelle.</p>
    </div>

    <div class="content">
      <div style="text-align: center; margin-bottom: 30px;">
        <span class="score-badge score-medium">${data.score}%</span>
        <p style="color: #666; margin-top: 10px;">Score obtenu au test de qualification</p>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Candidat</div>
          <div class="info-value">${data.candidateName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${data.candidateEmail}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Profil</div>
          <div class="info-value">${data.profile} ${data.seniority}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date du test</div>
          <div class="info-value">${new Date(data.testDate).toLocaleString('fr-FR')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Langues</div>
          <div class="info-value">${data.languages.join(', ')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Expertises</div>
          <div class="info-value">${data.expertises.join(', ') || 'Non spécifiées'}</div>
        </div>
      </div>

      <div class="answers-section">
        <h2>📝 Réponses du candidat</h2>
        ${data.answers.map((answer, index) => `
          <div class="answer-item">
            <div class="question">Question ${index + 1}: ${answer.question || 'Question non disponible'}</div>
            <div class="answer">${answer.userAnswer}</div>
            <div style="margin-top: 10px; color: #999; font-size: 14px;">
              Score: ${answer.score}/10
              ${answer.feedback ? `<br>Feedback: ${answer.feedback}` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="action-buttons">
        <p style="color: #666; margin-bottom: 20px;">
          Veuillez examiner les réponses et décider de la validation du profil.
        </p>
        <a href="https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/editor" class="btn btn-approve">
          Accéder au Dashboard
        </a>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin-top: 20px;">
        <strong>⚠️ Action requise :</strong><br>
        Connectez-vous au dashboard Supabase et mettez à jour le statut du candidat :
        <ul style="margin: 10px 0;">
          <li>Si validé : Mettre qualification_status = 'qualified'</li>
          <li>Si rejeté : Mettre qualification_status = 'rejected'</li>
        </ul>
        ID Candidat : <code>${data.candidateId}</code>
      </div>
    </div>

    <div class="footer">
      <p>Email automatique envoyé par la plateforme Vaya</p>
      <p>© ${new Date().getFullYear()} Vaya - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer avec Brevo
    if (BREVO_API_KEY) {
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
          to: [{
            email: data.to,
            name: 'Team Vaya'
          }],
          subject: data.subject,
          htmlContent: htmlContent
        }),
      });

      if (response.ok) {
        console.log('✅ Email envoyé avec Brevo');
        return new Response(
          JSON.stringify({ success: true, provider: 'brevo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        const error = await response.json();
        console.error('❌ Erreur Brevo:', error);
      }
    }

    // Si Brevo n'est pas configuré ou ne fonctionne pas
    console.error('❌ Brevo non configuré ou erreur d\'envoi');

    // Sauvegarder dans la base de données comme fallback
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('validation_pending').insert({
      candidate_id: data.candidateId,
      candidate_name: data.candidateName,
      candidate_email: data.candidateEmail,
      profile: data.profile,
      seniority: data.seniority,
      score: data.score,
      test_data: data.answers,
      test_date: data.testDate,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Email non envoyé mais sauvegardé en base',
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in send-validation-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});