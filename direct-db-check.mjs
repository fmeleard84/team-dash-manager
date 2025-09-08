import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== VÉRIFICATION DIRECTE BASE DE DONNÉES ===\n');

// Se connecter avec un utilisateur client pour avoir accès aux données
console.log('1. Connexion en tant que client...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'fmeleard+client@gmail.com',
  password: 'Test123456!' // Mot de passe par défaut de test
});

if (authError) {
  console.log('Erreur connexion:', authError.message);
  console.log('Essai avec un autre compte...');
  
  // Essayer avec d'autres comptes
  const emails = [
    'fmeleard+client_2@gmail.com',
    'fmeleard+client3@gmail.com',
    'fmeleard+client_4@gmail.com',
    'fmeleard+client_5@gmail.com'
  ];
  
  for (const email of emails) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Test123456!'
    });
    if (!error) {
      console.log(`✅ Connecté avec ${email}`);
      break;
    }
  }
}

// Maintenant chercher les projets
console.log('\n2. Recherche des projets 0832 et 0937...');
const { data: allProjects } = await supabase
  .from('projects')
  .select('id, title, status, owner_id')
  .order('created_at', { ascending: false })
  .limit(20);

console.log(`Nombre total de projets visibles: ${allProjects?.length || 0}`);

if (allProjects && allProjects.length > 0) {
  console.log('\nProjets trouvés:');
  allProjects.forEach(p => {
    if (p.title.includes('0832') || p.title.includes('0937')) {
      console.log(`  ⭐ ${p.title} (ID: ${p.id}, Status: ${p.status})`);
    } else {
      console.log(`  - ${p.title} (Status: ${p.status})`);
    }
  });
}

// Chercher spécifiquement les Kickoff
console.log('\n3. Recherche des événements Kickoff...');
const { data: allEvents } = await supabase
  .from('project_events')
  .select(`
    id,
    title,
    project_id,
    created_at,
    projects!inner(title)
  `)
  .or('title.ilike.%kickoff%,title.ilike.%0832%,title.ilike.%0937%')
  .order('created_at', { ascending: false });

console.log(`Événements trouvés: ${allEvents?.length || 0}`);

if (allEvents && allEvents.length > 0) {
  for (const event of allEvents) {
    console.log(`\n📅 ${event.title}`);
    console.log(`   Projet: ${event.projects?.title}`);
    console.log(`   Event ID: ${event.id}`);
    console.log(`   Créé le: ${new Date(event.created_at).toLocaleString()}`);
    
    // Vérifier les participants
    const { data: attendees, error: attendeesError } = await supabase
      .from('project_event_attendees')
      .select('*')
      .eq('event_id', event.id);
    
    if (attendeesError) {
      console.log(`   ❌ Erreur récupération participants: ${attendeesError.message}`);
    } else {
      console.log(`   👥 Participants: ${attendees?.length || 0}`);
      
      if (attendees && attendees.length > 0) {
        console.log('   Détails:');
        attendees.forEach(a => {
          console.log(`     - ID: ${a.id}`);
          console.log(`       user_id: ${a.user_id || 'NULL'}`);
          console.log(`       email: ${a.email || 'NULL'}`);
          console.log(`       role: ${a.role || 'NULL'}`);
          console.log(`       response_status: ${a.response_status || 'NULL'}`);
        });
      }
    }
  }
}

// Vérifier les colonnes de la table
console.log('\n4. Structure de project_event_attendees...');
const { data: sample } = await supabase
  .from('project_event_attendees')
  .select('*')
  .limit(1);

if (sample && sample.length > 0) {
  console.log('Colonnes disponibles:');
  Object.keys(sample[0]).forEach(col => {
    console.log(`  - ${col}`);
  });
}

// Déconnexion
await supabase.auth.signOut();

process.exit(0);