// deno-lint-ignore-file no-explicit-any
// Sync user profile (client/candidate) on Keycloak login
// - Upserts client_profiles or candidate_profiles based on provided groups
// - Uses Service Role to bypass RLS safely
// - CORS enabled for browser calls

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Prefer explicit body values, then headers
    const hdrs = req.headers;
    const sub = (body.sub ?? hdrs.get("x-keycloak-sub") ?? null) as string | null;
    const email = (body.email ?? hdrs.get("x-keycloak-email") ?? null) as string | null;
    const firstName = (body.first_name ?? body.firstName ?? "") as string;
    const lastName = (body.last_name ?? body.lastName ?? "") as string;

    const rawGroups: any = body.groups ?? [];
    const groups: string[] = Array.isArray(rawGroups)
      ? rawGroups
          .map((g) => (typeof g === "string" ? g : String(g)))
          .map((g) => (g.startsWith("/") ? g.slice(1) : g))
          .map((g) => (g === "ressources" || g === "ressource" ? "resource" : g))
          .map((g) => g.toLowerCase())
      : [];

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const groupSet = new Set(groups);
    const isCandidate = groupSet.has("candidate") || groupSet.has("resource");
    const isClient = groupSet.has("client");

    const results: Record<string, any> = { email, sub, groups };

    // Upsert candidate profile if relevant
    if (isCandidate) {
      // Try find by email or keycloak_user_id
      const { data: existingCandidate, error: findCandErr } = await supabase
        .from("candidate_profiles")
        .select("id")
        .or(`email.eq.${email}${sub ? ",keycloak_user_id.eq." + sub : ""}`)
        .maybeSingle();

      if (findCandErr) throw findCandErr;

      if (existingCandidate?.id) {
        const { error: updErr } = await supabase
          .from("candidate_profiles")
          .update({
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            keycloak_user_id: sub ?? undefined,
            is_email_verified: true,
          })
          .eq("id", existingCandidate.id);
        if (updErr) throw updErr;
        results.candidate = { updated: true, id: existingCandidate.id };
      } else {
        // Create minimal viable candidate profile
        const { data: inserted, error: insErr } = await supabase
          .from("candidate_profiles")
          .insert({
            email,
            first_name: firstName || "N/A",
            last_name: lastName || "N/A",
            keycloak_user_id: sub,
            password_hash: "keycloak",
            is_email_verified: true,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        results.candidate = { created: true, id: inserted.id };
      }
    }

    // Upsert client profile if relevant (can coexist; harmless to ensure both)
    if (isClient) {
      const { data: existingClient, error: findCliErr } = await supabase
        .from("client_profiles")
        .select("id")
        .or(`email.eq.${email}${sub ? ",keycloak_user_id.eq." + sub : ""}`)
        .maybeSingle();

      if (findCliErr) throw findCliErr;

      if (existingClient?.id) {
        const { error: updErr } = await supabase
          .from("client_profiles")
          .update({
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            keycloak_user_id: sub ?? undefined,
          })
          .eq("id", existingClient.id);
        if (updErr) throw updErr;
        results.client = { updated: true, id: existingClient.id };
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("client_profiles")
          .insert({
            email,
            first_name: firstName || "N/A",
            last_name: lastName || "N/A",
            keycloak_user_id: sub ?? undefined,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        results.client = { created: true, id: inserted.id };
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-profile] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
