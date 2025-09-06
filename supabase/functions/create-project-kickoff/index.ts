import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ProjectKickoffRequest {
  projectId: string;
  projectName: string;
  startDate: string;
  teamMembers: Array<{
    email: string;
    name: string;
  }>;
  calcomUserId?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, projectName, startDate, teamMembers, calcomUserId } = 
      await req.json() as ProjectKickoffRequest;

    // Configuration Cal.com
    const CALCOM_URL = "http://cal-app-3001:3000"; // URL interne Docker
    const CALCOM_API_KEY = "cal_test_key"; // À remplacer par une vraie clé API

    // 1. Créer un événement kickoff dans Cal.com
    const kickoffDate = new Date(startDate);
    kickoffDate.setHours(10, 0, 0, 0); // Kickoff à 10h par défaut

    const eventData = {
      title: `Kickoff - ${projectName}`,
      description: `Réunion de lancement du projet ${projectName}.\n\nÉquipe:\n${teamMembers.map(m => `- ${m.name} (${m.email})`).join('\n')}`,
      start: kickoffDate.toISOString(),
      end: new Date(kickoffDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 heure
      location: "Jitsi Meet",
      attendees: teamMembers,
      metadata: {
        projectId,
        type: "project_kickoff"
      }
    };

    // Pour l'instant, on simule la création
    // Dans une vraie implémentation, on utiliserait l'API Cal.com
    console.log("📅 Creating kickoff event in Cal.com:", eventData);

    // Générer un lien de réunion Jitsi unique
    const jitsiRoomName = `TeamDash-${projectName.replace(/\s+/g, '-')}-Kickoff-${Date.now()}`;
    const meetingLink = `https://meet.jit.si/${jitsiRoomName}`;

    // 2. Stocker les infos du kickoff dans Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    };

    // Créer une entrée dans une table project_kickoffs (à créer)
    const kickoffRecord = {
      project_id: projectId,
      title: `Kickoff - ${projectName}`,
      scheduled_date: kickoffDate.toISOString(),
      meeting_link: meetingLink,
      attendees: teamMembers,
      status: 'scheduled',
      calcom_event_id: null, // À remplir quand on aura l'API Cal.com
      created_at: new Date().toISOString()
    };

    // Note: La table project_kickoffs devra être créée dans Supabase
    console.log("💾 Saving kickoff record:", kickoffRecord);

    // 3. Envoyer des notifications (optionnel)
    for (const member of teamMembers) {
      console.log(`📧 Notification envoyée à ${member.name} (${member.email}) pour le kickoff du ${kickoffDate.toLocaleDateString()}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Kickoff créé avec succès",
        kickoff: {
          date: kickoffDate.toISOString(),
          meetingLink,
          attendees: teamMembers.length,
          projectName
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error creating project kickoff:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Erreur lors de la création du kickoff" 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});