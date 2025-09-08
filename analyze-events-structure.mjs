import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Analyse complète de la structure des événements ===\n');

// 1. Compter les événements
const { count: eventsCount } = await supabase
  .from('project_events')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Nombre total d'événements: ${eventsCount || 0}`);

// 2. Compter les participants
const { count: attendeesCount } = await supabase
  .from('project_event_attendees')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Nombre total de participants: ${attendeesCount || 0}`);

// 3. Récupérer quelques événements pour analyse
const { data: sampleEvents } = await supabase
  .from('project_events')
  .select('*')
  .limit(5);

if (sampleEvents && sampleEvents.length > 0) {
  console.log('\n=== Échantillon d\'événements ===');
  sampleEvents.forEach(e => {
    console.log(`\n- ${e.title}`);
    console.log(`  ID: ${e.id}`);
    console.log(`  Project: ${e.project_id}`);
  });
}

// 4. Vérifier la structure de project_event_attendees
console.log('\n=== Structure de project_event_attendees ===');
const { data: sampleAttendees } = await supabase
  .from('project_event_attendees')
  .select('*')
  .limit(1);

if (sampleAttendees && sampleAttendees.length > 0) {
  console.log('Colonnes détectées:');
  Object.keys(sampleAttendees[0]).forEach(key => {
    console.log(`  - ${key}: ${typeof sampleAttendees[0][key]}`);
  });
} else {
  console.log('❌ Aucun enregistrement dans project_event_attendees');
  console.log('   → La table est vide, ce qui explique pourquoi les participants n\'apparaissent pas');
}

// 5. Vérifier les projets actifs
console.log('\n=== Projets actifs ===');
const { data: activeProjects } = await supabase
  .from('projects')
  .select('id, title, status, owner_id')
  .eq('status', 'play')
  .limit(10);

console.log(`📊 Nombre de projets actifs: ${activeProjects?.length || 0}`);
activeProjects?.forEach(p => {
  console.log(`  - ${p.title} (${p.id})`);
});

// 6. Rechercher spécifiquement par metadata
console.log('\n=== Recherche dans les metadata ===');
const { data: eventsWithMetadata } = await supabase
  .from('project_events')
  .select('id, title, metadata')
  .not('metadata', 'is', null)
  .limit(5);

if (eventsWithMetadata && eventsWithMetadata.length > 0) {
  console.log('Événements avec metadata:');
  eventsWithMetadata.forEach(e => {
    console.log(`\n- ${e.title}`);
    if (e.metadata) {
      console.log('  Metadata:', JSON.stringify(e.metadata, null, 2));
    }
  });
} else {
  console.log('Aucun événement avec metadata trouvé');
}

process.exit(0);