import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventInvitationRequest {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  projectTitle: string;
  attendeesEmails: string[];
  organizerName?: string;
  videoUrl?: string;
  location?: string;
  isUpdate?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      projectTitle,
      attendeesEmails,
      organizerName = "L'équipe projet",
      videoUrl,
      location,
      isUpdate = false
    }: EventInvitationRequest = await req.json();

    console.log(`Sending event ${isUpdate ? 'update' : 'invitations'} for event: ${eventId} to ${attendeesEmails.length} attendees`);

    // Format the event date and time
    const eventDateTime = new Date(eventDate);
    const formattedDate = eventDateTime.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventTime || eventDateTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send emails to all attendees
    const emailPromises = attendeesEmails.map(async (email) => {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${isUpdate ? '📝 Événement modifié' : '📅 Invitation à un événement'}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">${eventTitle}</h2>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #4b5563;"><strong>📋 Projet :</strong> ${projectTitle}</p>
              <p style="margin: 0 0 10px 0; color: #4b5563;"><strong>📅 Date :</strong> ${formattedDate}</p>
              <p style="margin: 0 0 10px 0; color: #4b5563;"><strong>🕐 Heure :</strong> ${formattedTime}</p>
              ${location ? `<p style="margin: 0 0 10px 0; color: #4b5563;"><strong>📍 Lieu :</strong> ${location}</p>` : ''}
              <p style="margin: 0; color: #4b5563;"><strong>👤 Organisé par :</strong> ${organizerName}</p>
            </div>

            ${videoUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${videoUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  🎥 Rejoindre la réunion
                </a>
              </div>
            ` : ''}

            <p style="color: #6b7280; margin: 20px 0; line-height: 1.6;">
              ${isUpdate 
                ? `Les détails de cet événement ont été modifiés. Merci de mettre à jour votre calendrier pour le projet <strong>${projectTitle}</strong>.`
                : `Vous êtes invité(e) à participer à cet événement dans le cadre du projet <strong>${projectTitle}</strong>. Votre participation est importante pour le succès du projet.`
              }
            </p>

            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                💡 <strong>Astuce :</strong> Ajoutez cet événement à votre calendrier pour ne pas l'oublier !
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              Cet email a été envoyé automatiquement depuis votre plateforme de gestion de projets.
            </p>
          </div>
        </div>
      `;

      return resend.emails.send({
        from: "Équipe Projet <noreply@resend.dev>",
        to: [email],
        subject: `${isUpdate ? '📝 Modifié' : '📅 Invitation'}: ${eventTitle} - ${projectTitle}`,
        html: emailHtml,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    // Count successful and failed emails
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`Email sending completed: ${successful} successful, ${failed} failed`);

    if (failed > 0) {
      console.error("Some emails failed to send:", results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)
      );
    }

    return new Response(JSON.stringify({
      success: true,
      emailsSent: successful,
      emailsFailed: failed,
      message: `${isUpdate ? 'Notifications de modification' : 'Invitations'} envoyées avec succès à ${successful} participants`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-event-invitations function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);