import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Analyse de l\'événement Kickoff - 0832 ===\n');

// 1. Rechercher l'événement
const { data: events, error: eventsError } = await supabase
  .from('project_events')
  .select('*')
  .ilike('title', '%Kickoff - 0832%');

if (eventsError) {
  console.error('Erreur lors de la recherche de l\'événement:', eventsError);
  process.exit(1);
}

if (!events || events.length === 0) {
  console.log('❌ Aucun événement trouvé avec le titre "Kickoff - 0832"');
  process.exit(1);
}

const event = events[0];
console.log('✅ Événement trouvé:');
console.log('   - ID:', event.id);
console.log('   - Titre:', event.title);
console.log('   - Project ID:', event.project_id);
console.log('   - Date:', event.date);
console.log('   - Metadata:', JSON.stringify(event.metadata, null, 2));

// 2. Vérifier les participants dans project_event_attendees
console.log('\n=== Vérification des participants (project_event_attendees) ===');
const { data: attendees, error: attendeesError } = await supabase
  .from('project_event_attendees')
  .select('*')
  .eq('event_id', event.id);

if (attendeesError) {
  console.error('Erreur lors de la récupération des participants:', attendeesError);
} else {
  console.log(`\n📊 Nombre de participants enregistrés: ${attendees?.length || 0}`);
  
  if (attendees && attendees.length > 0) {
    console.log('\nListe des participants:');
    attendees.forEach(att => {
      console.log(`   - User ID: ${att.user_id}`);
      console.log(`     Status: ${att.status}`);
      console.log(`     Added at: ${att.added_at}`);
    });
  } else {
    console.log('❌ Aucun participant trouvé dans project_event_attendees');
  }
}

// 3. Vérifier la structure de la table project_event_attendees
console.log('\n=== Structure de la table project_event_attendees ===');
const { data: tableInfo, error: tableError } = await supabase
  .rpc('get_table_columns', { table_name: 'project_event_attendees' })
  .single();

if (!tableError && tableInfo) {
  console.log('Colonnes de la table:', tableInfo);
} else {
  // Alternative: essayer de récupérer un enregistrement pour voir la structure
  const { data: sample } = await supabase
    .from('project_event_attendees')
    .select('*')
    .limit(1);
  
  if (sample && sample.length > 0) {
    console.log('Structure détectée depuis un échantillon:');
    console.log('Colonnes:', Object.keys(sample[0]));
  }
}

// 4. Vérifier les membres du projet
console.log('\n=== Membres du projet ===');
const { data: project, error: projectError } = await supabase
  .from('projects')
  .select('*, owner_id')
  .eq('id', event.project_id)
  .single();

if (project) {
  console.log('Projet:', project.title);
  console.log('Owner ID:', project.owner_id);
  
  // Vérifier les ressources assignées
  const { data: assignments, error: assignmentsError } = await supabase
    .from('hr_resource_assignments')
    .select('*, candidate_profiles(*)')
    .eq('project_id', event.project_id)
    .eq('booking_status', 'accepted');
  
  if (assignments) {
    console.log(`\n📊 Nombre de candidats acceptés: ${assignments.length}`);
    assignments.forEach(a => {
      console.log(`   - Candidat ID: ${a.candidate_id}`);
      if (a.candidate_profiles) {
        console.log(`     Nom: ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}`);
      }
    });
  }
}

// 5. Vérifier si c'est un problème d'ID universels
console.log('\n=== Analyse des IDs (système unifié) ===');
console.log('⚠️ Rappel: Avec le système d\'IDs universels:');
console.log('   - candidate_profiles.id = auth.users.id');
console.log('   - client_profiles.id = auth.users.id');
console.log('   - Les attendees doivent utiliser ces IDs directement');

// 6. Suggestions
console.log('\n=== Diagnostic ===');
if (!attendees || attendees.length === 0) {
  console.log('🔴 Problème identifié: Les participants ne sont pas enregistrés dans project_event_attendees');
  console.log('   → L\'invitation a été créée mais les participants n\'ont pas été ajoutés');
  console.log('   → Cela peut être dû à un problème lors du processus de kickoff');
} else {
  console.log('🟡 Les participants sont bien enregistrés dans la base');
  console.log('   → Le problème est probablement dans l\'affichage (ViewEventDialog)');
}

process.exit(0);