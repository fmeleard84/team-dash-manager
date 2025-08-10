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

// Mailjet (optional)
const MJ_API_KEY = Deno.env.get("MJ_API_KEY");
const MJ_SECRET_KEY = Deno.env.get("MJ_SECRET_KEY");
const MJ_FROM_EMAIL = Deno.env.get("MJ_FROM_EMAIL");
const MJ_FROM_NAME = Deno.env.get("MJ_FROM_NAME") || "Cercle Vaya";

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

// Mailjet email sender
async function sendMailjetEmail(subject: string, html: string, to: string[], trace?: boolean) {
  if (!MJ_API_KEY || !MJ_SECRET_KEY || !MJ_FROM_EMAIL) {
    if (trace) console.warn('[Mailjet] missing configuration');
    return;
  }
  const payload = {
    Messages: [
      {
        From: { Email: MJ_FROM_EMAIL, Name: MJ_FROM_NAME },
        To: to.map((Email) => ({ Email })),
        Subject: subject,
        HTMLPart: html,
      },
    ],
  };
  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${MJ_API_KEY}:${MJ_SECRET_KEY}`),
    },
    body: JSON.stringify(payload),
  });
  const mjText = await res.text();
  if (trace) console.log('[Mailjet] send', res.status, mjText);
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

async function createTalkRoom(title: string, invites: string[], trace: boolean) {
  const params = new URLSearchParams({ roomType: "2", name: title });
  if (invites && invites.length) {
    // Invite users by their Nextcloud user ids (we use emails as user ids)
    params.append("invite", invites.join(","));
  }
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

  // Subfolders by category + client brief markdown + Talk + Deck + Notifications
  // Compute Nextcloud Files URL early
  const filesUrl = `${NEXTCLOUD_BASE_URL}/apps/files?dir=/${encodeURIComponent(folderName)}`;

  // Gather resource categories and profile names
  let categories: string[] = [];
  const categoryToProfiles: Record<string, string[]> = {};
  try {
    const { data: ra } = await supabase
      .from('hr_resource_assignments')
      .select('profile_id')
      .eq('project_id', projectId);
    const profileIds = Array.from(new Set((ra || []).map(r => r.profile_id).filter(Boolean)));
    if (profileIds.length) {
      const { data: profs } = await supabase
        .from('hr_profiles')
        .select('id, name, category_id')
        .in('id', profileIds);
      const catIds = Array.from(new Set((profs || []).map(p => p.category_id).filter(Boolean)));
      let catMap: Record<string, string> = {};
      if (catIds.length) {
        const { data: cats } = await supabase
          .from('hr_categories')
          .select('id, name')
          .in('id', catIds);
        catMap = Object.fromEntries((cats || []).map(c => [c.id, c.name]));
      }
      for (const p of profs || []) {
        const catName = catMap[p.category_id as unknown as string] || 'Général';
        if (!categoryToProfiles[catName]) categoryToProfiles[catName] = [];
        categoryToProfiles[catName].push(p.name);
      }
      categories = Object.keys(categoryToProfiles);
    }
  } catch (e) {
    if (trace) console.warn('[NC] categories fetch failed', e);
  }

  // Create subfolders per category (best-effort)
  for (const cat of categories) {
    const subPath = encodePath(`files/${NEXTCLOUD_ADMIN_USERNAME}/${folderName}/${cat}`);
    const mk = await davRequest('MKCOL', subPath);
    if (trace) console.log('[NC] MKCOL sub', cat, mk.status);
  }

  // Create client brief as Markdown (visible to both groups via root share)
  try {
    const briefContent = `# Brief du besoin\n\nProjet: ${title}\n\nObjectif\n- Décrivez l'objectif principal.\n\nContexte\n- Contexte et enjeux.\n\nLivrables attendus\n- Liste des livrables.\n\nRisques & contraintes\n- Points d'attention.\n`;
    const briefPath = encodePath(`files/${NEXTCLOUD_ADMIN_USERNAME}/${folderName}/Brief du besoin.md`);
    const putBrief = await davRequest('PUT', briefPath, briefContent, 'text/markdown');
    if (trace) console.log('[NC] PUT brief markdown', putBrief.status);
  } catch (e) {
    if (trace) console.warn('[NC] brief creation failed', e);
  }

  // Talk (best-effort) with invites
  const allUsers = [...members.client, ...members.resources];
  const talk = await createTalkRoom(title, allUsers, trace).catch(() => ({ token: null, url: null }));

  // Post welcome message to Talk room (resources and client will see it)
  if (talk?.token) {
    try {
      await ocsRequest('POST', `/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(talk.token)}`, new URLSearchParams({ message: 'Bienvenue à la Team !!' }));
      if (trace) console.log('[NC] talk welcome message sent');
    } catch (e) {
      if (trace) console.warn('[NC] talk welcome failed', e);
    }
  }

  // Calendar (best-effort)
  const calendar = await createCalendarAndEvent(title, kickoffAt, trace).catch(() => ({ calendarUrl: `${NEXTCLOUD_BASE_URL}/apps/calendar/` }));

  // Deck board with lists per category and cards per resource
  let deckUrl: string | null = null;
  try {
    const boardParams = new URLSearchParams({ title });
    const bRes = await ocsRequest('POST', '/ocs/v2.php/apps/deck/api/v1/boards', boardParams);
    const boardId = bRes.json?.ocs?.data?.id;
    if (trace) console.log('[NC] deck board', bRes.status, bRes.json?.ocs?.meta);
    if (boardId) {
      deckUrl = `${NEXTCLOUD_BASE_URL}/apps/deck/#/board/${boardId}`;
      const stacks: Record<string, number> = {};
      for (const cat of categories) {
        const sRes = await ocsRequest('POST', `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`, new URLSearchParams({ title: cat }));
        const stackId = sRes.json?.ocs?.data?.id;
        if (stackId) stacks[cat] = stackId;
      }
      // Client stack with objectif card
      const clientStack = await ocsRequest('POST', `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`, new URLSearchParams({ title: 'Client' }));
      const clientStackId = clientStack.json?.ocs?.data?.id;
      if (clientStackId) {
        await ocsRequest('POST', `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks/${clientStackId}/cards`, new URLSearchParams({ title: 'Objectif' }));
      }
      // Cards for resources
      for (const cat of categories) {
        const stackId = stacks[cat];
        if (!stackId) continue;
        const names = categoryToProfiles[cat] || [];
        for (const n of names) {
          await ocsRequest('POST', `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks/${stackId}/cards`, new URLSearchParams({ title: n }));
        }
      }
    }
  } catch (e) {
    if (trace) console.warn('[NC] deck setup failed', e);
  }

  // Nextcloud notifications (best-effort)
  try {
    const notify = async (user: string, shortMessage: string, longMessage: string) => {
      const params = new URLSearchParams({ shortMessage, longMessage, user, link: filesUrl });
      const r = await ocsRequest('POST', '/ocs/v2.php/apps/notifications/api/v2/admin/notifications', params);
      if (trace) console.log('[NC] notify', user, r.status, r.json?.ocs?.meta);
    };
    for (const u of allUsers) {
      await notify(u, `Projet prêt: ${title}`, 'Votre espace collaboratif est disponible.');
    }
  } catch (e) {
    if (trace) console.warn('[NC] notifications failed', e);
  }

  // Persist in DB (upsert-like)
  const { data: existing } = await supabase
    .from('nextcloud_projects')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('nextcloud_projects')
      .update({ nextcloud_url: filesUrl, folder_path: `/${folderName}`, talk_url: talk.url || null })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('nextcloud_projects')
      .insert({ project_id: projectId, nextcloud_url: filesUrl, folder_path: `/${folderName}`, talk_url: talk.url || null });
  }

  // Email notifications via Mailjet (best-effort)
  try {
    const subject = `Votre accès au projet ${title}`;
    const cta = `<a href="${filesUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Rejoindre le projet</a>`;
    const talkPart = talk.url ? `<p>Salon Talk: <a href="${talk.url}">${talk.url}</a></p>` : '';
    const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">${title}</h2>
        <p>Votre espace Nextcloud a été créé. Cliquez ci-dessous pour y accéder directement (SSO).</p>
        <p style="margin:16px 0">${cta}</p>
        ${talkPart}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Vous recevez cet email car vous avez été ajouté au projet.</p>
      </div>`;
    const recipients = Array.from(new Set(allUsers.filter(Boolean)));
    if (recipients.length) await sendMailjetEmail(subject, html, recipients, trace);
  } catch (e) {
    if (trace) console.warn('[Mailjet] notifications failed', e);
  }

  return json({ ok: true, nextcloud: { filesUrl, talkUrl: talk.url, calendarUrl: calendar.calendarUrl, deckUrl }, correlationId });
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
