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
    const { action, projectId, resourceAssignmentId } = body || {};

    if (action !== "get_candidate_project_details") {
      return new Response(JSON.stringify({ success: false, message: "Invalid action" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!projectId) {
      return new Response(JSON.stringify({ success: false, message: "projectId requis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const keycloakEmail = req.headers.get("x-keycloak-email") || "";
    if (!keycloakEmail) {
      return new Response(JSON.stringify({ success: false, message: "Email non fourni" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("[project-details] Request", { projectId, resourceAssignmentId, keycloakEmail });

    const candidate = await getCandidateByEmail(supabase, keycloakEmail);
    if (!candidate?.id) {
      return new Response(JSON.stringify({ success: false, message: "Candidat introuvable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

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
  } catch (err) {
    console.error("[project-details] Error", err);
    return new Response(JSON.stringify({ success: false, message: "Erreur serveur" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
