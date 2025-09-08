import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Vérification avec authentification ===\n');

// Essayer de se connecter avec un utilisateur test
console.log('Tentative de connexion...');

// D'abord, essayons de voir s'il y a des utilisateurs
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, role')
  .limit(10);

console.log(`Profils trouvés: ${profiles?.length || 0}`);
if (profiles && profiles.length > 0) {
  console.log('\nProfils:');
  profiles.forEach(p => {
    console.log(`  - ${p.email} (${p.role})`);
  });
}

// Chercher des projets avec title contenant "0832"
console.log('\n\nRecherche du projet 0832...');
const { data: searchProjects, error: searchError } = await supabase
  .from('projects')
  .select('*')
  .ilike('title', '%0832%');

if (searchError) {
  console.log('Erreur recherche:', searchError);
} else if (searchProjects && searchProjects.length > 0) {
  console.log(`✅ Projet trouvé !`);
  const project = searchProjects[0];
  console.log(`  Titre: ${project.title}`);
  console.log(`  ID: ${project.id}`);
  console.log(`  Status: ${project.status}`);
  console.log(`  Owner: ${project.owner_id}`);
  
  // Vérifier les événements de ce projet
  console.log('\n  Événements du projet:');
  const { data: events } = await supabase
    .from('project_events')
    .select('id, title, created_at')
    .eq('project_id', project.id);
  
  if (events && events.length > 0) {
    events.forEach(e => {
      console.log(`    - ${e.title} (ID: ${e.id})`);
    });
    
    // Vérifier les participants du premier événement
    const firstEvent = events[0];
    console.log(`\n  Participants de "${firstEvent.title}":`);
    
    const { data: attendees } = await supabase
      .from('project_event_attendees')
      .select('*')
      .eq('event_id', firstEvent.id);
    
    console.log(`    Nombre de participants: ${attendees?.length || 0}`);
    if (attendees && attendees.length > 0) {
      attendees.forEach(a => {
        console.log(`    - user_id: ${a.user_id || 'NULL'}, email: ${a.email}, status: ${a.response_status || a.status}`);
      });
    }
  } else {
    console.log('    Aucun événement');
  }
} else {
  console.log('❌ Projet 0832 non trouvé');
}

// Vérifier tous les événements récents
console.log('\n\n=== Tous les événements récents ===');
const { data: allEvents } = await supabase
  .from('project_events')
  .select(`
    id,
    title,
    project_id,
    created_at,
    project_event_attendees (
      id,
      user_id,
      email,
      role,
      response_status
    )
  `)
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`Total événements: ${allEvents?.length || 0}`);
if (allEvents && allEvents.length > 0) {
  allEvents.forEach(e => {
    console.log(`\n- ${e.title}`);
    console.log(`  Participants: ${e.project_event_attendees?.length || 0}`);
    if (e.project_event_attendees && e.project_event_attendees.length > 0) {
      e.project_event_attendees.forEach(a => {
        console.log(`    • user_id: ${a.user_id || 'NULL'} | email: ${a.email || 'NULL'} | role: ${a.role || 'NULL'}`);
      });
    }
  });
}

process.exit(0);