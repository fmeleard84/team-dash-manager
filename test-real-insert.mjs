import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== TEST INSERTION RÉELLE ===\n');

// 1. Récupérer l'événement Test event créé
const { data: event } = await supabase
  .from('project_events')
  .select('id, title, project_id')
  .eq('id', 'a5ae5a86-555c-427d-9f7d-0a1835171adf')
  .single();

if (!event) {
  console.log('❌ Événement introuvable');
  process.exit(1);
}

console.log(`✅ Événement trouvé: ${event.title}`);

// 2. Récupérer un vrai user_id
const { data: project } = await supabase
  .from('projects')
  .select('owner_id')
  .eq('id', event.project_id)
  .single();

if (!project || !project.owner_id) {
  console.log('❌ Projet ou owner introuvable');
  process.exit(1);
}

console.log(`✅ Owner ID: ${project.owner_id}`);

// 3. Tester l'insertion simple
console.log('\n📝 Test insertion simple...');

const attendeeData = {
  event_id: event.id,
  user_id: project.owner_id,
  email: 'test@example.com',
  role: 'client',
  required: true,
  response_status: 'pending'
};

console.log('Données à insérer:', attendeeData);

// Méthode 1: Insert simple
console.log('\n1️⃣ Insert simple (sans array)...');
const { data: result1, error: error1 } = await supabase
  .from('project_event_attendees')
  .insert(attendeeData);

console.log('Résultat:', error1 ? `❌ ${error1.message}` : '✅ Success');
if (error1) {
  console.log('Code:', error1.code);
  console.log('Détails:', error1.details);
  console.log('Hint:', error1.hint);
}

// Méthode 2: Insert avec array
console.log('\n2️⃣ Insert avec array...');
const { data: result2, error: error2 } = await supabase
  .from('project_event_attendees')
  .insert([attendeeData]);

console.log('Résultat:', error2 ? `❌ ${error2.message}` : '✅ Success');
if (error2) {
  console.log('Code:', error2.code);
  console.log('Détails:', error2.details);
}

// Méthode 3: Insert avec select
console.log('\n3️⃣ Insert avec select()...');
const { data: result3, error: error3 } = await supabase
  .from('project_event_attendees')
  .insert([attendeeData])
  .select();

console.log('Résultat:', error3 ? `❌ ${error3.message}` : '✅ Success');
if (error3) {
  console.log('Code:', error3.code);
  console.log('Détails:', error3.details);
}

// 4. Vérifier si des participants existent
console.log('\n📊 Vérification des participants...');
const { data: attendees, error: checkError } = await supabase
  .from('project_event_attendees')
  .select('*')
  .eq('event_id', event.id);

console.log(`Nombre de participants: ${attendees?.length || 0}`);
if (attendees && attendees.length > 0) {
  attendees.forEach(a => {
    console.log(`  - user_id: ${a.user_id}, email: ${a.email}`);
  });
}

// 5. Analyser la requête HTTP
console.log('\n🔍 Analyse de la requête HTTP...');
console.log('Les requêtes Supabase passent par PostgREST qui peut ajouter automatiquement ON CONFLICT.');
console.log('Vérifier dans le Network tab du navigateur pour voir la requête exacte.');

process.exit(0);