// Edge function: project-details
// Returns project details for a candidate based on existing notification
// CORS enabled; uses service role to safely fetch and enforce custom checks

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-keycloak-email, x-keycloak-sub",
};

function getSupabaseClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    throw new Error("Server misconfiguration");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function getCandidateByEmail(supabase: any, email: string) {
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function hasNotificationForProject(supabase: any, candidateId: string, projectId: string) {
  const { data, error } = await supabase
    .from("candidate_notifications")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("project_id", projectId)
    .limit(1);
  if (error) throw error;
  return (data?.length || 0) > 0;
}

async function getProjectDetails(supabase: any, projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, project_date, due_date, client_budget")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getResourceProfileName(supabase: any, resourceAssignmentId?: string) {
  if (!resourceAssignmentId) return null;
  const { data, error } = await supabase
    .from("hr_resource_assignments")
    .select("hr_profiles(name)")
    .eq("id", resourceAssignmentId)
    .maybeSingle();
  if (error) throw error;
  return data?.hr_profiles?.name ?? null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const body = await req.json().catch(() => ({}));
    const { action, projectId, resourceAssignmentId, projectIds } = body || {};

    const keycloakEmail = req.headers.get("x-keycloak-email") || "";
    if (!keycloakEmail) {
      return new Response(JSON.stringify({ success: false, message: "Email non fourni" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const candidate = await getCandidateByEmail(supabase, keycloakEmail);
    if (!candidate?.id) {
      return new Response(JSON.stringify({ success: false, message: "Candidat introuvable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Action router
    if (action === 'get_candidate_projects_details') {
      const { projectIds } = body;
      
      if (!projectIds || !Array.isArray(projectIds)) {
        return new Response(
          JSON.stringify({ error: 'projectIds array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const projectsData: any[] = [];
        
        for (const projectId of projectIds) {
          const projectDetails = await getProjectDetails(supabase, projectId);
          if (projectDetails) {
            projectsData.push(projectDetails);
          }
        }

        return new Response(
          JSON.stringify({ projectsData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error fetching project details:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch project details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === "get_candidate_project_details") {
      if (!projectId) {
        return new Response(JSON.stringify({ success: false, message: "projectId requis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log("[project-details] Details", { projectId, resourceAssignmentId, keycloakEmail });

      const hasNotif = await hasNotificationForProject(supabase, candidate.id, projectId);
      if (!hasNotif) {
        return new Response(JSON.stringify({ success: false, message: "Aucune notification liée à ce projet" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const project = await getProjectDetails(supabase, projectId);
      if (!project) {
        return new Response(JSON.stringify({ success: false, message: "Projet introuvable" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const resourceProfile = await getResourceProfileName(supabase, resourceAssignmentId);

      return new Response(
        JSON.stringify({ success: true, project: { ...project, resourceProfile } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_candidate_nextcloud_links") {
      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "projectIds requis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Only return links for projects where the candidate has accepted/completed a booking
      const { data: bookings, error: bookingsErr } = await supabase
        .from("project_bookings")
        .select("project_id, status")
        .in("project_id", projectIds)
        .eq("candidate_id", candidate.id)
        .in("status", ["accepted", "completed"]);
      if (bookingsErr) throw bookingsErr;

      const allowedProjectIds = (bookings || []).map((b: any) => b.project_id);
      if (allowedProjectIds.length === 0) {
        return new Response(JSON.stringify({ success: true, links: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: ncRows, error: ncErr } = await supabase
        .from("nextcloud_projects")
        .select("project_id, nextcloud_url")
        .in("project_id", allowedProjectIds);
      if (ncErr) throw ncErr;

      const links: Record<string, string> = {};
      for (const row of ncRows || []) {
        links[row.project_id] = row.nextcloud_url;
      }

      return new Response(JSON.stringify({ success: true, links }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (err) {
    console.error("[project-details] Error", err);
    return new Response(JSON.stringify({ success: false, message: "Erreur serveur" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
