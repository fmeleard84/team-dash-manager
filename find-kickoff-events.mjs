import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Recherche des événements récents ===\n');

// 1. Rechercher tous les événements récents
const { data: events, error: eventsError } = await supabase
  .from('project_events')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);

if (eventsError) {
  console.error('Erreur:', eventsError);
  process.exit(1);
}

console.log(`📊 ${events?.length || 0} événements récents trouvés:\n`);

let kickoffEvent = null;

events?.forEach((event, index) => {
  console.log(`${index + 1}. ${event.title}`);
  console.log(`   - ID: ${event.id}`);
  console.log(`   - Project ID: ${event.project_id}`);
  console.log(`   - Date: ${event.date}`);
  console.log(`   - Créé le: ${event.created_at}`);
  
  // Rechercher spécifiquement les kickoffs ou 0832
  if (event.title?.toLowerCase().includes('kickoff') || 
      event.title?.includes('0832')) {
    console.log(`   ⭐ KICKOFF TROUVÉ!`);
    kickoffEvent = event;
  }
  console.log('');
});

// 2. Si on a trouvé un kickoff, analyser ses participants
if (kickoffEvent) {
  console.log('\n=== Analyse détaillée du Kickoff ===');
  console.log('Événement:', kickoffEvent.title);
  console.log('ID:', kickoffEvent.id);
  
  // Vérifier les participants
  const { data: attendees, error: attendeesError } = await supabase
    .from('project_event_attendees')
    .select('*')
    .eq('event_id', kickoffEvent.id);
  
  console.log(`\n📊 Participants enregistrés: ${attendees?.length || 0}`);
  
  if (attendees && attendees.length > 0) {
    console.log('\nDétails des participants:');
    for (const att of attendees) {
      console.log(`\n   Participant ${att.user_id}:`);
      console.log(`   - Status: ${att.status}`);
      console.log(`   - Role: ${att.role || 'non défini'}`);
      console.log(`   - Added at: ${att.added_at}`);
      
      // Essayer de récupérer les infos du participant
      // D'abord vérifier si c'est un client
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('first_name, last_name')
        .eq('id', att.user_id)
        .single();
      
      if (clientProfile) {
        console.log(`   - Type: CLIENT`);
        console.log(`   - Nom: ${clientProfile.first_name} ${clientProfile.last_name}`);
      } else {
        // Sinon vérifier si c'est un candidat
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('first_name, last_name')
          .eq('id', att.user_id)
          .single();
        
        if (candidateProfile) {
          console.log(`   - Type: CANDIDAT`);
          console.log(`   - Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
        } else {
          console.log(`   - Type: INCONNU (profil non trouvé)`);
        }
      }
    }
  } else {
    console.log('❌ AUCUN PARTICIPANT ENREGISTRÉ');
    console.log('   → C\'est probablement la cause du problème');
  }
  
  // Vérifier le projet associé
  console.log('\n=== Projet associé ===');
  const { data: project } = await supabase
    .from('projects')
    .select('title, owner_id, status')
    .eq('id', kickoffEvent.project_id)
    .single();
  
  if (project) {
    console.log('Titre du projet:', project.title);
    console.log('Status:', project.status);
    console.log('Owner ID:', project.owner_id);
    
    // Vérifier les candidats acceptés
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select('candidate_id, booking_status')
      .eq('project_id', kickoffEvent.project_id)
      .eq('booking_status', 'accepted');
    
    console.log(`\n📊 Candidats acceptés sur le projet: ${assignments?.length || 0}`);
    assignments?.forEach(a => {
      console.log(`   - Candidat ID: ${a.candidate_id}`);
    });
  }
}

// 3. Rechercher aussi par projet "0832"
console.log('\n=== Recherche du projet 0832 ===');
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .or('title.ilike.%0832%,description.ilike.%0832%');

if (projects && projects.length > 0) {
  console.log(`✅ Projet trouvé contenant "0832":`);
  projects.forEach(p => {
    console.log(`   - ID: ${p.id}`);
    console.log(`   - Titre: ${p.title}`);
    console.log(`   - Status: ${p.status}`);
  });
} else {
  console.log('❌ Aucun projet contenant "0832" trouvé');
}

process.exit(0);