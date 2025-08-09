import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helpers
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NEXTCLOUD_BASE_URL = Deno.env.get('NEXTCLOUD_BASE_URL')!; // e.g. https://cloud.ialla.fr
const NEXTCLOUD_ADMIN_USERNAME = Deno.env.get('NEXTCLOUD_ADMIN_USERNAME')!;
const NEXTCLOUD_ADMIN_PASSWORD = Deno.env.get('NEXTCLOUD_ADMIN_PASSWORD')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function basicAuthHeader() {
  const token = btoa(`${NEXTCLOUD_ADMIN_USERNAME}:${NEXTCLOUD_ADMIN_PASSWORD}`);
  return `Basic ${token}`;
}

function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function encodePath(path: string) {
  // Encode each segment to avoid issues with spaces and special chars
  return path.split('/').map(encodeURIComponent).join('/');
}

async function ocsRequest(method: string, path: string, body?: URLSearchParams) {
  const url = `${NEXTCLOUD_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'OCS-APIRequest': 'true',
    'Accept': 'application/json',
    'Authorization': basicAuthHeader(),
  };
  let init: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = body.toString();
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { res, json, text };
}

async function davRequest(method: string, path: string, body?: string, contentType?: string) {
  const url = `${NEXTCLOUD_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': basicAuthHeader(),
  };
  if (contentType) headers['Content-Type'] = contentType;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text().catch(() => '');
  return { res, text };
}

async function ensureGroup(groupId: string) {
  // Try to create the group, if it already exists Nextcloud returns failure code 102
  const body = new URLSearchParams({ groupid: groupId });
  const { res, json, text } = await ocsRequest('POST', '/ocs/v1.php/cloud/groups', body);
  console.log('[Nextcloud] ensureGroup', groupId, res.status, json || text);
  // Ignore errors if group exists already
}

async function ensureUser(user: { username: string; email: string; displayName?: string; role?: 'client' | 'ressource' }) {
  // Check existence
  const check = await ocsRequest('GET', `/ocs/v1.php/cloud/users/${encodeURIComponent(user.username)}`);
  console.log('[Nextcloud] check user', user.username, check.res.status);

  if (check.res.status !== 200) {
    // Create user with random strong password (SSO will be used for auth)
    const password = crypto.randomUUID() + '_' + crypto.randomUUID();
    const body = new URLSearchParams({
      userid: user.username,
      password,
      email: user.email,
    });
    if (user.displayName) body.set('displayName', user.displayName);

    const create = await ocsRequest('POST', '/ocs/v1.php/cloud/users', body);
    console.log('[Nextcloud] create user', user.username, create.res.status, create.json || create.text);
    if (!create.res.ok) {
      throw new Error(`Failed to create user ${user.username}: ${create.text}`);
    }
  }

  // Ensure role-based groups exist and add user
  if (user.role) {
    const groupId = user.role === 'client' ? 'clients' : 'ressources';
    await ensureGroup(groupId);
    const addToGroup = await ocsRequest('POST', `/ocs/v1.php/cloud/users/${encodeURIComponent(user.username)}/groups`, new URLSearchParams({ groupid: groupId }));
    console.log('[Nextcloud] add user to group', user.username, groupId, addToGroup.res.status, addToGroup.json || addToGroup.text);
  }
}

async function ensureProjectFolder(folderName: string) {
  const davPath = `/remote.php/dav/files/${encodeURIComponent(NEXTCLOUD_ADMIN_USERNAME)}/${encodePath(folderName)}`;
  const mkcol = await davRequest('MKCOL', davPath);
  console.log('[Nextcloud] MKCOL folder', folderName, mkcol.res.status, mkcol.text);
  // 201 Created or 405/409 if already exists -> acceptable
  if (mkcol.res.status !== 201 && mkcol.res.status !== 405 && mkcol.res.status !== 409) {
    throw new Error(`Failed to create/ensure folder: ${mkcol.res.status} ${mkcol.text}`);
  }
}

async function shareFolderWithGroup(folderName: string, groupId: string, permissions: number) {
  const body = new URLSearchParams({
    path: folderName,
    shareType: '1', // group
    shareWith: groupId,
    permissions: String(permissions),
  });
  const share = await ocsRequest('POST', '/ocs/v2.php/apps/files_sharing/api/v1/shares', body);
  console.log('[Nextcloud] share folder with group', groupId, permissions, share.res.status, share.json || share.text);
}

async function shareFolderWithUsers(folderName: string, usernames: string[]) {
  for (const username of usernames) {
    const body = new URLSearchParams({
      path: folderName,
      shareType: '0', // user
      shareWith: username,
      permissions: '31', // all permissions
    });
    const share = await ocsRequest('POST', '/ocs/v2.php/apps/files_sharing/api/v1/shares', body);
    console.log('[Nextcloud] share folder with user', username, share.res.status, share.json || share.text);
    // If it already exists, Nextcloud may return an error code; we log and continue
  }
}

// --- Group Folders (Team folders) helpers ---
async function getGroupFolderIdByName(mountpoint: string): Promise<string | null> {
  const { res, json, text } = await ocsRequest('GET', '/ocs/v2.php/apps/groupfolders/folders');
  if (!res.ok) {
    console.warn('[Nextcloud] list groupfolders failed', res.status, json || text);
    return null;
  }
  const data = json?.ocs?.data;
  let items: any[] = [];
  if (Array.isArray(data)) items = data;
  else if (data && typeof data === 'object') items = Object.values(data);
  const found = items.find((f: any) => f?.mount_point === mountpoint || f?.mountpoint === mountpoint || f?.mountPoint === mountpoint);
  return found?.id ? String(found.id) : null;
}

async function createGroupFolder(mountpoint: string): Promise<string | null> {
  const body = new URLSearchParams({ mountpoint });
  const { res, json, text } = await ocsRequest('POST', '/ocs/v2.php/apps/groupfolders/folders', body);
  console.log('[Nextcloud] create groupfolder', mountpoint, res.status, json || text);
  const id = json?.ocs?.data?.id ?? json?.ocs?.data;
  return id ? String(id) : null;
}

async function addGroupToGroupFolder(folderId: string, groupId: string) {
  const body = new URLSearchParams({ groupid: groupId });
  const { res, json, text } = await ocsRequest('POST', `/ocs/v2.php/apps/groupfolders/folders/${folderId}/groups`, body);
  console.log('[Nextcloud] add group to groupfolder', folderId, groupId, res.status, json || text);
}

async function setGroupFolderPermissions(folderId: string, groupId: string, permissions: number) {
  const body = new URLSearchParams({ permissions: String(permissions) });
  const { res, json, text } = await ocsRequest('POST', `/ocs/v2.php/apps/groupfolders/folders/${folderId}/groups/${encodeURIComponent(groupId)}`, body);
  console.log('[Nextcloud] set groupfolder permissions', folderId, groupId, permissions, res.status, json || text);
}

async function ensureTeamFolder(folderName: string, clientGroupId: string, resGroupId: string): Promise<boolean> {
  // Try to use Group Folders app first
  let folderId = await getGroupFolderIdByName(folderName);
  if (!folderId) {
    folderId = await createGroupFolder(folderName);
  }
  if (!folderId) return false;

  // Attach groups and permissions
  await addGroupToGroupFolder(folderId, clientGroupId);
  await setGroupFolderPermissions(folderId, clientGroupId, 31); // full access

  await addGroupToGroupFolder(folderId, resGroupId);
  await setGroupFolderPermissions(folderId, resGroupId, 5); // read + create

  return true;
}

async function createTalkRoom(name: string, usernames: string[]) {
  // Create a group conversation and invite usernames
  const body = new URLSearchParams();
  body.set('roomType', 'group'); // use string type as per newer API
  body.set('displayName', name);
  for (const u of usernames) body.append('invite', u);
  const { res, json, text } = await ocsRequest('POST', '/ocs/v2.php/apps/spreed/api/v4/room', body);
  console.log('[Nextcloud] create talk room', res.status, json || text);
  // Return URL/token if available
  const token = json?.ocs?.data?.token || json?.ocs?.data?.roomToken;
  const url = token ? `${NEXTCLOUD_BASE_URL}/call/${token}` : undefined;
  return { token, url };
}

function formatICSDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  // Use UTC
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) + 'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) + 'Z'
  );
}

async function createCalendarAndEvent(calendarName: string, eventTitle: string, eventDescription: string, start: Date, end: Date, attendees?: string[]) {
  const calSlug = slugify(calendarName);
  const calBase = `/remote.php/dav/calendars/${encodeURIComponent(NEXTCLOUD_ADMIN_USERNAME)}/${encodePath(calSlug)}`;

  // Create calendar (MKCALENDAR)
  const mkCalBody = `<?xml version="1.0" encoding="utf-8"?>\n<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n  <D:set>\n    <D:prop>\n      <D:displayname>${calendarName}</D:displayname>\n      <C:supported-calendar-component-set>\n        <C:comp name="VEVENT"/>\n      </C:supported-calendar-component-set>\n    </D:prop>\n  </D:set>\n</C:mkcalendar>`;
  const mkCal = await davRequest('MKCALENDAR', calBase, mkCalBody, 'application/xml; charset=utf-8');
  console.log('[Nextcloud] MKCALENDAR', calendarName, mkCal.res.status, mkCal.text);
  // 201 Created or 405 if already exists
  if (mkCal.res.status !== 201 && mkCal.res.status !== 405) {
    console.warn('Calendar creation returned non-success code, continuing');
  }

  // Create first event
  const uid = crypto.randomUUID();
  const attendeesLines = (attendees || []).map((e) => `ATTENDEE;CN=${e};ROLE=REQ-PARTICIPANT:mailto:${e}`).join('\n');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HaaS//Nextcloud Integration//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${formatICSDate(new Date())}\nDTSTART:${formatICSDate(start)}\nDTEND:${formatICSDate(end)}\nSUMMARY:${eventTitle}\nDESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}\n${attendeesLines}\nEND:VEVENT\nEND:VCALENDAR\n`;
  const eventPath = `${calBase}/${uid}.ics`;
  const putEvent = await davRequest('PUT', eventPath, ics, 'text/calendar; charset=utf-8');
  console.log('[Nextcloud] PUT event', putEvent.res.status, putEvent.text);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, kickoffStart } = await req.json();
    if (action !== 'setup-workspace') {
      return new Response(JSON.stringify({ success: false, message: 'Unsupported action' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    if (!projectId) {
      return new Response(JSON.stringify({ success: false, message: 'Missing projectId' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Fetch project info
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, title, description, keycloak_user_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!project) throw new Error('Project not found');

    // Fetch client profile by keycloak_user_id
    let clientEmail: string | null = null;
    let clientDisplay: string | null = null;
    let clientUsername: string | null = null;
    if (project.keycloak_user_id) {
      const { data: client, error: clientErr } = await supabase
        .from('client_profiles')
        .select('email, first_name, last_name, keycloak_user_id')
        .eq('keycloak_user_id', project.keycloak_user_id)
        .maybeSingle();
      if (clientErr) console.warn('Fetch client profile error', clientErr);
      if (client) {
        clientEmail = client.email;
        clientDisplay = `${client.first_name || ''} ${client.last_name || ''}`.trim();
        clientUsername = (client.email?.split('@')[0] || `client-${project.id}`).toLowerCase();
      }
    }

// Fetch accepted resources for this project
const { data: bookings, error: bookErr } = await supabase
  .from('project_bookings')
  .select('candidate_id, resource_assignment_id, candidate_profiles(email, first_name, last_name)')
  .eq('project_id', projectId)
  .eq('status', 'accepted');
if (bookErr) throw bookErr;

    const members: { username: string; email: string; displayName?: string; role: 'client' | 'ressource' }[] = [];
    if (clientEmail) {
      members.push({
        username: clientUsername!,
        email: clientEmail,
        displayName: clientDisplay || clientEmail,
        role: 'client',
      });
    }
    for (const b of bookings || []) {
      const c = b.candidate_profiles;
      if (!c?.email) continue;
      const username = (c.email.split('@')[0] || crypto.randomUUID()).toLowerCase();
      const displayName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email;
      members.push({ username, email: c.email, displayName, role: 'ressource' });
    }

    console.log('[Workspace] Members derived', members);

    // Ensure users exist and in proper groups
    for (const m of members) {
      await ensureUser(m);
    }

// Create project-specific groups and assign members
const clientGroupId = `projet-${slugify(project.title)}-client`;
const resGroupId = `projet-${slugify(project.title)}-ressources`;
await ensureGroup(clientGroupId);
await ensureGroup(resGroupId);
for (const m of members) {
  const groupid = m.role === 'client' ? clientGroupId : resGroupId;
  const add = await ocsRequest(
    'POST',
    `/ocs/v1.php/cloud/users/${encodeURIComponent(m.username)}/groups`,
    new URLSearchParams({ groupid })
  );
  console.log('[Nextcloud] add user to project role group', m.username, groupid, add.res.status, add.json || add.text);
}

const folderName = `Projet - ${project.title}`;
// Prefer Group Folders app if available; fallback to regular shares
const teamFolderOk = await ensureTeamFolder(folderName, clientGroupId, resGroupId).catch((e) => {
  console.warn('Groupfolders setup failed', e);
  return false;
});
if (!teamFolderOk) {
  await ensureProjectFolder(folderName);
  await shareFolderWithGroup(folderName, clientGroupId, 31);
  await shareFolderWithGroup(folderName, resGroupId, 5);
}
    // Create Talk room (best effort)
    const talk = await createTalkRoom(`Projet - ${project.title}`, members.map(m => m.username)).catch((e) => {
      console.warn('Talk room creation failed', e);
      return { url: undefined };
    });

    // Create calendar and first kickoff event (best effort)
    let start: Date;
    if (kickoffStart) {
      start = new Date(kickoffStart);
    } else {
      const now = new Date();
      start = new Date(now.getTime());
      start.setUTCDate(start.getUTCDate() + 1);
      start.setUTCHours(10, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const eventTitle = `Réunion de lancement – Projet ${project.title}`;
    const owner = clientDisplay || clientEmail || 'Client';
    const eventDesc = `Réunion de lancement organisée par ${owner}.\nDétails: ${project.description || ''}\nVisio: ${talk.url || 'À définir'}`;

    await createCalendarAndEvent(`Projet - ${project.title}`, eventTitle, eventDesc, start, end, (members || []).map(m => m.email).filter(Boolean)).catch((e) => {
      console.warn('Calendar creation failed', e);
    });

const webUrl = `${NEXTCLOUD_BASE_URL}/apps/files/?dir=/${encodeURIComponent(folderName)}`;

// Persist workspace link
const { error: upsertErr } = await supabase
  .from('nextcloud_projects')
  .upsert(
    { project_id: projectId, nextcloud_url: webUrl, folder_path: `/${folderName}`, talk_url: talk.url || null },
    { onConflict: 'project_id' }
  );
if (upsertErr) console.warn('Failed to upsert nextcloud_projects', upsertErr);

// Notify all accepted resources
if (bookings && bookings.length > 0) {
  const rows = bookings
    .filter((b: any) => !!b.candidate_id)
    .map((b: any) => ({
      project_id: projectId,
      candidate_id: b.candidate_id,
      resource_assignment_id: b.resource_assignment_id,
      title: `Espace Nextcloud prêt`,
      description: `Votre espace collaboratif Nextcloud pour le projet "${project.title}" est prêt. Accédez-y ici: ${webUrl}`,
      status: 'unread',
    }));
  if (rows.length > 0) {
    const { error: notifErr } = await supabase.from('candidate_notifications').insert(rows);
    if (notifErr) console.warn('Failed to insert candidate notifications', notifErr);
  }
}

const response = {
  success: true,
  projectId,
  folderPath: `/${folderName}`,
  webUrl,
  talkUrl: talk.url,
};

return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (error) {
    console.error('[nextcloud-integration] Error', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
