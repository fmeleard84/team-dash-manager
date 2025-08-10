// Supabase Edge Function: nc-orchestrator
// Purpose: Single endpoint to orchestrate Nextcloud workspaces for projects
// Actions:
// - health-check
// - project-start: ensure users, groups, folder, shares, talk, calendar; persist URLs
// - user-swap: replace a project member email in groups

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email, x-debug-trace",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NEXTCLOUD_BASE_URL = Deno.env.get("NEXTCLOUD_BASE_URL")!;
const NEXTCLOUD_ADMIN_USERNAME = Deno.env.get("NEXTCLOUD_ADMIN_USERNAME")!;
const NEXTCLOUD_ADMIN_PASSWORD = Deno.env.get("NEXTCLOUD_ADMIN_PASSWORD")!;

// Helpers
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), ...corsHeaders },
  });

const basicAuthHeader = () =>
  "Basic " + btoa(`${NEXTCLOUD_ADMIN_USERNAME}:${NEXTCLOUD_ADMIN_PASSWORD}`);

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

// OCS API request
async function ocsRequest(method: string, path: string, body?: URLSearchParams) {
  const url = `${NEXTCLOUD_BASE_URL}${path}${path.includes("?") ? "&" : "?"}format=json`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuthHeader(),
      "OCS-APIREQUEST": "true",
      "Content-Type": body ? "application/x-www-form-urlencoded" : "application/json",
    },
    body,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, ok: res.ok, text, json };
}

// WebDAV request
async function davRequest(method: string, path: string, body?: string, contentType = "application/xml") {
  const url = `${NEXTCLOUD_BASE_URL}/remote.php/dav/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": contentType,
    },
    body,
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function ensureGroup(groupName: string, trace: boolean) {
  const params = new URLSearchParams({ groupid: groupName });
  const r = await ocsRequest("POST", "/ocs/v1.php/cloud/groups", params);
  if (trace) console.log("[NC] ensureGroup", groupName, r.status, r.json?.ocs?.meta);
  // 102 => exists, treat as OK
  return true;
}

async function ensureUser(email: string, trace: boolean) {
  // Search user
  const search = await ocsRequest("GET", `/ocs/v1.php/cloud/users?search=${encodeURIComponent(email)}`);
  const users = search.json?.ocs?.data?.users || [];
  if (users?.some((u: string) => u === email)) {
    if (trace) console.log("[NC] user exists", email);
    return true;
  }
  // Create user with random password
  const pwd = crypto.randomUUID();
  const params = new URLSearchParams({ userid: email, password: pwd, email });
  const r = await ocsRequest("POST", "/ocs/v1.php/cloud/users", params);
  if (trace) console.log("[NC] create user", email, r.status, r.json?.ocs?.meta);
  return r.ok || r.json?.ocs?.meta?.statuscode === 102; // exists
}

async function addUserToGroup(email: string, groupName: string, trace: boolean) {
  const params = new URLSearchParams({ groupid: groupName });
  const r = await ocsRequest("POST", `/ocs/v1.php/cloud/users/${encodeURIComponent(email)}/groups`, params);
  if (trace) console.log("[NC] add user to group", email, groupName, r.status, r.json?.ocs?.meta);
  return true;
}

async function ensureProjectFolder(title: string, trace: boolean) {
  const folderName = `Projet - ${title}`;
  const encoded = encodePath(`files/${NEXTCLOUD_ADMIN_USERNAME}/${folderName}`);
  const r = await davRequest("MKCOL", encoded);
  if (trace) console.log("[NC] MKCOL", folderName, r.status);
  // 201 created, 405 exists
  return { folderName };
}

async function shareFolderWithGroup(folderName: string, groupName: string, permissions: number, trace: boolean) {
  const params = new URLSearchParams({
    path: `/${folderName}`,
    shareType: "1", // group
    shareWith: groupName,
    permissions: String(permissions),
  });
  const r = await ocsRequest("POST", "/ocs/v1.php/apps/files_sharing/api/v1/shares", params);
  if (trace) console.log("[NC] share folder", folderName, groupName, permissions, r.status, r.json?.ocs?.meta);
  return true;
}

async function createTalkRoom(title: string, trace: boolean) {
  const params = new URLSearchParams({ roomType: "1", name: title });
  const r = await ocsRequest("POST", "/ocs/v2.php/apps/spreed/api/v4/room", params);
  if (trace) console.log("[NC] talk room", title, r.status, r.json?.ocs?.meta || r.text);
  const token = r.json?.ocs?.data?.token || null;
  const url = token ? `${NEXTCLOUD_BASE_URL}/call/${token}` : null;
  return { token, url };
}

function formatICSDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

async function createCalendarAndEvent(title: string, kickoffAt?: string, trace?: boolean) {
  const calId = `projet-${slugify(title)}`;
  const calPath = `calendars/${NEXTCLOUD_ADMIN_USERNAME}/${calId}/`;
  const mk = await davRequest("MKCALENDAR", calPath);
  if (trace) console.log("[NC] MKCALENDAR", calId, mk.status, mk.text);

  if (!kickoffAt) return { calendarUrl: `${NEXTCLOUD_BASE_URL}/apps/calendar/` };

  const dtStart = formatICSDate(kickoffAt);
  const dtEnd = formatICSDate(new Date(new Date(kickoffAt).getTime() + 60 * 60 * 1000).toISOString());
  const uid = crypto.randomUUID();
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HaaS//Project//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${dtStart}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:Kickoff - ${title}\nEND:VEVENT\nEND:VCALENDAR`;
  const put = await davRequest("PUT", `${calPath}${uid}.ics`, ics, "text/calendar");
  if (trace) console.log("[NC] PUT event", put.status, put.text);
  return { calendarUrl: `${NEXTCLOUD_BASE_URL}/apps/calendar/` };
}

async function getProjectMembers(projectId: string, provided?: { client?: string[]; resources?: string[] }, trace?: boolean) {
  const members = { client: [] as string[], resources: [] as string[] };

  if (provided?.client?.length) members.client = provided.client;
  if (provided?.resources?.length) members.resources = provided.resources;

  if (!members.client.length || !members.resources.length) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, keycloak_user_id, title")
      .eq("id", projectId)
      .maybeSingle();

    if (!members.client.length && project?.keycloak_user_id) {
      const { data: clientProfiles } = await supabase
        .from("client_profiles")
        .select("email")
        .eq("keycloak_user_id", project.keycloak_user_id);
      if (clientProfiles && clientProfiles.length) members.client = [clientProfiles[0].email];
    }

    if (!members.resources.length) {
      const { data: assignments } = await supabase
        .from("candidate_project_assignments")
        .select("candidate_id")
        .eq("project_id", projectId);
      const ids = (assignments || []).map(a => a.candidate_id).filter(Boolean);
      if (ids.length) {
        const { data: candidates } = await supabase
          .from("candidate_profiles")
          .select("email")
          .in("id", ids);
        members.resources = (candidates || []).map(c => c.email).filter(Boolean);
      }
    }
  }

  if (trace) console.log("[Workspace] Members", members);
  return members;
}

async function handleProjectStart(body: any, trace: boolean, correlationId: string) {
  const { projectId, projectTitle, kickoffAt, members: providedMembers } = body;
  if (!projectId || !projectTitle) return json({ ok: false, code: "INVALID_INPUT", hint: "projectId and projectTitle are required", correlationId }, { status: 400 });

  const members = await getProjectMembers(projectId, providedMembers, trace);

  const title = projectTitle;
  const slug = slugify(title);
  const clientGroup = `projet-${slug}-client`;
  const resGroup = `projet-${slug}-ressources`;

  await ensureGroup(clientGroup, trace);
  await ensureGroup(resGroup, trace);

  // Ensure users and group membership
  for (const email of members.client) {
    await ensureUser(email, trace);
    await addUserToGroup(email, clientGroup, trace);
  }
  for (const email of members.resources) {
    await ensureUser(email, trace);
    await addUserToGroup(email, resGroup, trace);
  }

  // Folder + shares
  const { folderName } = await ensureProjectFolder(title, trace);
  await shareFolderWithGroup(folderName, clientGroup, 1, trace); // read-only
  await shareFolderWithGroup(folderName, resGroup, 31, trace); // full: read+write+create+delete+share

  // Talk (best-effort)
  const talk = await createTalkRoom(`Projet - ${title}`, trace).catch(() => ({ token: null, url: null }));

  // Calendar (best-effort)
  const calendar = await createCalendarAndEvent(title, kickoffAt, trace).catch(() => ({ calendarUrl: `${NEXTCLOUD_BASE_URL}/apps/calendar/` }));

  const filesUrl = `${NEXTCLOUD_BASE_URL}/apps/files?dir=/${encodeURIComponent(folderName)}`;

  // Persist in DB (upsert-like)
  const { data: existing } = await supabase
    .from("nextcloud_projects")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("nextcloud_projects")
      .update({ nextcloud_url: filesUrl, folder_path: `/${folderName}`, talk_url: talk.url || null })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("nextcloud_projects")
      .insert({ project_id: projectId, nextcloud_url: filesUrl, folder_path: `/${folderName}`, talk_url: talk.url || null });
  }

  return json({ ok: true, nextcloud: { filesUrl, talkUrl: talk.url, calendarUrl: calendar.calendarUrl }, correlationId });
}

async function handleUserSwap(body: any, trace: boolean, correlationId: string) {
  const { projectId, from, to, role } = body;
  if (!projectId || !from || !to || !role) return json({ ok: false, code: "INVALID_INPUT", hint: "projectId, from, to, role required", correlationId }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("title").eq("id", projectId).maybeSingle();
  if (!project) return json({ ok: false, code: "PROJECT_NOT_FOUND", correlationId }, { status: 404 });
  const slug = slugify(project.title);
  const groupName = role === "client" ? `projet-${slug}-client` : `projet-${slug}-ressources`;

  await ensureUser(to, trace);
  await ensureGroup(groupName, trace);

  // Remove from old group (best-effort)
  await ocsRequest("DELETE", `/ocs/v1.php/cloud/users/${encodeURIComponent(from)}/groups?groupid=${encodeURIComponent(groupName)}`);
  // Add new user
  await addUserToGroup(to, groupName, trace);

  return json({ ok: true, correlationId });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = new Date().toISOString() + "-" + crypto.randomUUID().slice(0, 6);
  const isTrace = req.headers.get("x-debug-trace") === "true";

  let bodyText = "";
  try {
    bodyText = await req.text();
    if (isTrace) console.log("[nc-orchestrator] Raw body", correlationId, bodyText);
  } catch (e) {
    console.error("[nc-orchestrator] read body failed", correlationId, e);
    return json({ ok: false, code: "READ_BODY_FAILED", correlationId }, { status: 400 });
  }

  let body: any = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch (e) {
    console.error("[nc-orchestrator] JSON parse failed", correlationId, e);
    return json({ ok: false, code: "INVALID_JSON", correlationId }, { status: 400 });
  }

  const action = body.action;
  if (isTrace) console.log("[nc-orchestrator] Action", correlationId, action);

  try {
    if (action === "health-check") return json({ ok: true, ts: new Date().toISOString(), correlationId });
    if (action === "project-start") return await handleProjectStart(body, isTrace, correlationId);
    if (action === "user-swap") return await handleUserSwap(body, isTrace, correlationId);

    return json({ ok: false, code: "UNKNOWN_ACTION", correlationId, hint: "Use: health-check | project-start | user-swap" }, { status: 400 });
  } catch (e: any) {
    console.error("[nc-orchestrator] Uncaught error", correlationId, e?.message || e);
    return json({ ok: false, code: "UNEXPECTED_ERROR", message: String(e?.message || e), correlationId }, { status: 500 });
  }
});
