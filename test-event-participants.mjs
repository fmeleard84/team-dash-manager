import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Test des participants aux événements ===\n');

// 1. Vérifier les événements récents
console.log('1. Recherche des événements récents...');
const { data: events, error: eventsError } = await supabase
  .from('project_events')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (eventsError) {
  console.error('Erreur:', eventsError);
  process.exit(1);
}

console.log(`✅ ${events?.length || 0} événements trouvés\n`);

if (events && events.length > 0) {
  // Pour chaque événement, vérifier les participants
  for (const event of events) {
    console.log(`\n📅 Événement: ${event.title}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Date: ${event.start_at}`);
    
    // Vérifier les participants avec la nouvelle structure
    const { data: attendees, error: attendeesError } = await supabase
      .from('project_event_attendees')
      .select('*')
      .eq('event_id', event.id);
    
    if (attendeesError) {
      console.error(`   ❌ Erreur récupération participants:`, attendeesError);
      continue;
    }
    
    console.log(`   📊 Participants: ${attendees?.length || 0}`);
    
    if (attendees && attendees.length > 0) {
      console.log('   \n   Détails des participants:');
      for (const att of attendees) {
        console.log(`   - ID enregistrement: ${att.id}`);
        console.log(`     user_id: ${att.user_id || '❌ MANQUANT'}`);
        console.log(`     email: ${att.email || 'non défini'}`);
        console.log(`     role: ${att.role || 'non défini'}`);
        console.log(`     response_status: ${att.response_status || att.status || 'non défini'}`);
        console.log(`     required: ${att.required}`);
        
        // Si user_id existe, récupérer les infos du profil
        if (att.user_id) {
          // Essayer client_profiles
          const { data: client } = await supabase
            .from('client_profiles')
            .select('first_name, last_name, email')
            .eq('id', att.user_id)
            .single();
          
          if (client) {
            console.log(`     ✅ Trouvé dans client_profiles: ${client.first_name} ${client.last_name}`);
          } else {
            // Essayer candidate_profiles
            const { data: candidate } = await supabase
              .from('candidate_profiles')
              .select('first_name, last_name, email')
              .eq('id', att.user_id)
              .single();
            
            if (candidate) {
              console.log(`     ✅ Trouvé dans candidate_profiles: ${candidate.first_name} ${candidate.last_name}`);
            } else {
              console.log(`     ❌ user_id ${att.user_id} non trouvé dans les profils`);
            }
          }
        } else {
          console.log(`     ⚠️ user_id manquant - participant non identifiable`);
        }
        console.log('');
      }
    } else {
      console.log('   ❌ Aucun participant enregistré');
    }
  }
}

// 2. Vérifier la structure de la table
console.log('\n\n=== Structure de la table project_event_attendees ===');
const { data: sampleAttendee } = await supabase
  .from('project_event_attendees')
  .select('*')
  .limit(1);

if (sampleAttendee && sampleAttendee.length > 0) {
  console.log('Colonnes disponibles:');
  Object.keys(sampleAttendee[0]).forEach(col => {
    const value = sampleAttendee[0][col];
    console.log(`  - ${col}: ${typeof value} (exemple: ${value})`);
  });
} else {
  console.log('Table vide ou inaccessible');
}

// 3. Vérifier les projets actifs avec leurs membres
console.log('\n\n=== Projets actifs et leurs équipes ===');
const { data: activeProjects } = await supabase
  .from('projects')
  .select('id, title, owner_id, status')
  .eq('status', 'play')
  .limit(5);

if (activeProjects && activeProjects.length > 0) {
  for (const project of activeProjects) {
    console.log(`\n🚀 Projet: ${project.title}`);
    console.log(`   Status: ${project.status}`);
    
    // Vérifier le client
    const { data: owner } = await supabase
      .from('client_profiles')
      .select('id, first_name, last_name, email')
      .eq('id', project.owner_id)
      .single();
    
    if (owner) {
      console.log(`   👤 Client: ${owner.first_name} ${owner.last_name} (ID: ${owner.id})`);
    }
    
    // Vérifier les candidats
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        booking_status,
        candidate_profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', project.id)
      .eq('booking_status', 'accepted');
    
    if (assignments && assignments.length > 0) {
      console.log(`   👥 Candidats (${assignments.length}):`);
      assignments.forEach(a => {
        if (a.candidate_profiles) {
          console.log(`      - ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name} (ID: ${a.candidate_id})`);
        }
      });
    } else {
      console.log('   👥 Aucun candidat accepté');
    }
  }
} else {
  console.log('Aucun projet actif trouvé');
}

console.log('\n\n=== Diagnostic ===');
console.log('Si les participants n\'apparaissent pas, vérifiez:');
console.log('1. La colonne user_id est-elle présente et remplie ?');
console.log('2. Les user_id correspondent-ils aux IDs dans client_profiles/candidate_profiles ?');
console.log('3. La colonne response_status existe-t-elle (pas status) ?');
console.log('4. Les policies RLS permettent-elles la lecture ?');

process.exit(0);