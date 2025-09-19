import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const archivedProjectId = 'f5fb7160-1b80-4081-89f6-0ce59bcd07ab'; // Gestion Site Web WordPress

console.log('🔍 Test des restrictions sur projet archivé...\n');
console.log('Projet: Gestion Site Web WordPress');
console.log('ID:', archivedProjectId, '\n');

// Test 1: Messages
console.log('📧 Test ajout message...');
const { error: messageError } = await supabase
  .from('messages')
  .insert({
    project_id: archivedProjectId,
    sender_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
    content: 'Test message sur projet archivé',
  });

if (messageError) {
  console.log('   ❌ Bloqué:', messageError.message);
} else {
  console.log('   ⚠️ Autorisé (devrait être bloqué)');
}

// Test 2: Kanban
console.log('\n📋 Test ajout carte Kanban...');
const { error: kanbanError } = await supabase
  .from('kanban_cards')
  .insert({
    project_id: archivedProjectId,
    title: 'Test carte',
    column_id: 'todo',
  });

if (kanbanError) {
  console.log('   ❌ Bloqué:', kanbanError.message);
} else {
  console.log('   ⚠️ Autorisé (devrait être bloqué)');
}

// Test 3: Events
console.log('\n📅 Test ajout événement...');
const { error: eventError } = await supabase
  .from('project_events')
  .insert({
    project_id: archivedProjectId,
    title: 'Test event',
    start_date: new Date().toISOString(),
    created_by: '00000000-0000-0000-0000-000000000000',
  });

if (eventError) {
  console.log('   ❌ Bloqué:', eventError.message);
} else {
  console.log('   ⚠️ Autorisé (devrait être bloqué)');
}

// Test 4: Files (Storage)
console.log('\n📁 Test upload fichier...');
const file = new Blob(['Test content'], { type: 'text/plain' });
const { error: fileError } = await supabase.storage
  .from('project-files')
  .upload(`projects/${archivedProjectId}/test-file.txt`, file);

if (fileError) {
  console.log('   ❌ Bloqué:', fileError.message);
} else {
  console.log('   ⚠️ Autorisé (devrait être bloqué)');
  // Clean up
  await supabase.storage
    .from('project-files')
    .remove([`projects/${archivedProjectId}/test-file.txt`]);
}

console.log('\n✅ Tests terminés');
console.log('\n💡 Recommandation:');
console.log('Si les modifications sont autorisées, implémenter les restrictions côté client');
console.log('en désactivant les boutons/formulaires pour les projets archivés.');