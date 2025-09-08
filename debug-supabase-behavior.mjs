import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DEBUG COMPORTEMENT SUPABASE ===\n');

// 1. Vérifier les contraintes existantes
console.log('1. Vérification des contraintes sur project_event_attendees...');
const { data: constraints, error: constraintError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT 
      con.conname as constraint_name,
      con.contype as constraint_type,
      pg_get_constraintdef(con.oid) as definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'project_event_attendees'
    AND con.contype IN ('u', 'p', 'x');
  `
});

if (constraints && Array.isArray(constraints)) {
  console.log('Contraintes trouvées:');
  constraints.forEach(c => {
    console.log(`  - ${c.constraint_name} (${c.constraint_type}): ${c.definition}`);
  });
} else if (constraints) {
  console.log('Réponse contraintes:', constraints);
} else {
  console.log('Aucune contrainte trouvée ou erreur:', constraintError);
}

// 2. Vérifier les index
console.log('\n2. Vérification des index...');
const { data: indexes } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'project_event_attendees';
  `
});

if (indexes && Array.isArray(indexes)) {
  console.log('Index trouvés:');
  indexes.forEach(idx => {
    console.log(`  - ${idx.indexname}`);
    console.log(`    ${idx.indexdef}`);
  });
} else if (indexes) {
  console.log('Réponse indexes:', indexes);
}

// 3. Tester différentes méthodes d'insertion
console.log('\n3. Test des méthodes d\'insertion...');

// Créer un événement de test
const testEventId = 'test-' + Date.now();
const testUserId = '12345678-1234-1234-1234-123456789012'; // UUID fictif

// Méthode 1: insert() simple
console.log('\n  Méthode 1: insert() simple');
const { error: error1 } = await supabase
  .from('project_event_attendees')
  .insert({
    event_id: testEventId,
    user_id: testUserId,
    email: 'test@example.com',
    role: 'client',
    required: true,
    response_status: 'pending'
  });

console.log('  Résultat:', error1 ? `❌ ${error1.message}` : '✅ Success');
if (error1?.code) console.log('  Code erreur:', error1.code);

// Méthode 2: insert() avec array
console.log('\n  Méthode 2: insert() avec array');
const { error: error2 } = await supabase
  .from('project_event_attendees')
  .insert([{
    event_id: testEventId + '-2',
    user_id: testUserId,
    email: 'test2@example.com',
    role: 'client',
    required: true,
    response_status: 'pending'
  }]);

console.log('  Résultat:', error2 ? `❌ ${error2.message}` : '✅ Success');
if (error2?.code) console.log('  Code erreur:', error2.code);

// Méthode 3: upsert() explicite
console.log('\n  Méthode 3: upsert() explicite');
const { error: error3 } = await supabase
  .from('project_event_attendees')
  .upsert({
    event_id: testEventId + '-3',
    user_id: testUserId,
    email: 'test3@example.com',
    role: 'client',
    required: true,
    response_status: 'pending'
  });

console.log('  Résultat:', error3 ? `❌ ${error3.message}` : '✅ Success');
if (error3?.code) console.log('  Code erreur:', error3.code);

// 4. Vérifier la version de PostgREST
console.log('\n4. Version de PostgREST...');
const { data: version } = await supabase.rpc('exec_sql', {
  sql: "SELECT current_setting('server_version') as version;"
});

if (version) {
  console.log('  PostgreSQL version:', version[0]?.version);
}

// 5. Vérifier les RLS policies
console.log('\n5. Policies RLS...');
const { data: policies } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT 
      polname as policy_name,
      polcmd as command
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'project_event_attendees';
  `
});

if (policies && Array.isArray(policies) && policies.length > 0) {
  console.log('Policies actives:');
  policies.forEach(p => {
    console.log(`  - ${p.policy_name} (${p.command})`);
  });
} else if (policies) {
  console.log('Réponse policies:', policies);
} else {
  console.log('Aucune policy RLS ou RLS désactivé');
}

// Nettoyer les données de test
await supabase
  .from('project_event_attendees')
  .delete()
  .like('event_id', 'test-%');

console.log('\n=== DIAGNOSTIC ===');
console.log('Si toutes les méthodes insert() échouent avec la même erreur ON CONFLICT,');
console.log('cela peut être dû à :');
console.log('1. Un trigger PostgreSQL qui transforme INSERT en UPSERT');
console.log('2. Une configuration PostgREST qui force le comportement UPSERT');
console.log('3. Une contrainte cachée ou mal configurée');
console.log('4. Un problème avec la version du client Supabase JS');

process.exit(0);