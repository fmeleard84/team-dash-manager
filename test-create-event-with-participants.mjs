import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Test création événement avec participants ===\n');

// 1. Trouver un projet actif
console.log('1. Recherche d\'un projet actif...');
const { data: projects, error: projectsError } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'play')
  .limit(1);

if (projectsError || !projects?.length) {
  console.error('❌ Aucun projet actif trouvé');
  process.exit(1);
}

const project = projects[0];
console.log(`✅ Projet trouvé: ${project.title} (ID: ${project.id})`);

// 2. Récupérer l'équipe du projet
console.log('\n2. Récupération de l\'équipe...');
const teamMembers = [];

// Client
if (project.owner_id) {
  const { data: client } = await supabase
    .from('client_profiles')
    .select('id, email, first_name, last_name')
    .eq('id', project.owner_id)
    .single();
  
  if (client) {
    teamMembers.push({
      ...client,
      role: 'client'
    });
    console.log(`  - Client: ${client.first_name} ${client.last_name} (ID: ${client.id})`);
  }
}

// Candidats acceptés
const { data: assignments } = await supabase
  .from('hr_resource_assignments')
  .select(`
    candidate_id,
    candidate_profiles (
      id,
      email,
      first_name,
      last_name
    )
  `)
  .eq('project_id', project.id)
  .eq('booking_status', 'accepted');

if (assignments) {
  assignments.forEach(a => {
    if (a.candidate_profiles) {
      teamMembers.push({
        ...a.candidate_profiles,
        role: 'resource'
      });
      console.log(`  - Candidat: ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name} (ID: ${a.candidate_id})`);
    }
  });
}

console.log(`✅ ${teamMembers.length} membres trouvés`);

if (teamMembers.length === 0) {
  console.error('❌ Aucun membre dans l\'équipe');
  process.exit(1);
}

// 3. Créer un événement de test
console.log('\n3. Création d\'un événement de test...');
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(14, 0, 0, 0);
const endTime = new Date(tomorrow);
endTime.setHours(15, 0, 0, 0);

const { data: event, error: eventError } = await supabase
  .from('project_events')
  .insert({
    project_id: project.id,
    title: `Test Event - ${now.toLocaleTimeString()}`,
    description: 'Événement de test avec participants',
    start_at: tomorrow.toISOString(),
    end_at: endTime.toISOString(),
    location: 'Salle de réunion',
    video_url: 'https://meet.jit.si/test-' + Date.now(),
    created_by: project.owner_id
  })
  .select()
  .single();

if (eventError) {
  console.error('❌ Erreur création événement:', eventError);
  process.exit(1);
}

console.log(`✅ Événement créé: ${event.title} (ID: ${event.id})`);

// 4. Ajouter les participants avec user_id
console.log('\n4. Ajout des participants avec user_id...');
const attendees = teamMembers.map(member => ({
  event_id: event.id,
  user_id: member.id, // ID universel
  email: member.email, // Pour compatibilité
  role: member.role,
  required: true,
  response_status: 'pending'
}));

console.log('Données à insérer:', JSON.stringify(attendees, null, 2));

const { error: attendeesError } = await supabase
  .from('project_event_attendees')
  .insert(attendees);

if (attendeesError) {
  console.error('❌ Erreur ajout participants:', attendeesError);
  process.exit(1);
}

console.log('✅ Participants ajoutés avec succès');

// 5. Vérification immédiate
console.log('\n5. Vérification des participants enregistrés...');
const { data: savedAttendees, error: verifyError } = await supabase
  .from('project_event_attendees')
  .select('*')
  .eq('event_id', event.id);

if (verifyError) {
  console.error('❌ Erreur vérification:', verifyError);
} else {
  console.log(`✅ ${savedAttendees?.length || 0} participants enregistrés`);
  
  if (savedAttendees && savedAttendees.length > 0) {
    console.log('\nDétails des participants:');
    for (const att of savedAttendees) {
      console.log(`  - ID: ${att.id}`);
      console.log(`    user_id: ${att.user_id || '❌ MANQUANT'}`);
      console.log(`    email: ${att.email}`);
      console.log(`    role: ${att.role}`);
      console.log(`    response_status: ${att.response_status}`);
      console.log('');
    }
  }
}

// 6. Test de récupération comme dans ViewEventDialog
console.log('\n6. Test récupération comme dans ViewEventDialog...');
const { data: eventWithAttendees } = await supabase
  .from('project_events')
  .select(`
    *,
    project_event_attendees (*)
  `)
  .eq('id', event.id)
  .single();

console.log(`Nombre de participants récupérés via join: ${eventWithAttendees?.project_event_attendees?.length || 0}`);

console.log('\n=== Test terminé ===');
console.log(`Événement créé: "${event.title}"`);
console.log(`Projet: "${project.title}"`);
console.log(`Participants: ${teamMembers.length}`);
console.log('\n✅ Vous pouvez maintenant ouvrir l\'application et vérifier que les participants apparaissent');

process.exit(0);