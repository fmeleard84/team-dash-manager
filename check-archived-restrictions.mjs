import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Vérification des restrictions sur les projets archivés...\n');

// Récupérer un projet archivé pour tester
const { data: archivedProject } = await supabase
  .from('projects')
  .select('*')
  .not('archived_at', 'is', null)
  .limit(1)
  .single();

if (archivedProject) {
  console.log(`✅ Projet archivé trouvé: ${archivedProject.title}`);
  console.log(`   - ID: ${archivedProject.id}`);
  console.log(`   - Archivé le: ${new Date(archivedProject.archived_at).toLocaleDateString()}`);
  console.log(`   - Statut: ${archivedProject.status}`);

  // Vérifier les politiques RLS sur différentes tables
  console.log('\n🔒 Vérification des restrictions d\'écriture:');

  // Test sur messages
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      project_id: archivedProject.id,
      sender_id: archivedProject.owner_id,
      content: 'Test message',
    });

  console.log(`   - Messages: ${messageError ? '❌ Bloqué' : '✅ Autorisé'}`);

  // Test sur kanban_cards
  const { error: kanbanError } = await supabase
    .from('kanban_cards')
    .insert({
      project_id: archivedProject.id,
      title: 'Test card',
      column_id: 'todo',
    });

  console.log(`   - Kanban: ${kanbanError ? '❌ Bloqué' : '✅ Autorisé'}`);

  // Test sur project_events
  const { error: eventError } = await supabase
    .from('project_events')
    .insert({
      project_id: archivedProject.id,
      title: 'Test event',
      start_date: new Date().toISOString(),
      created_by: archivedProject.owner_id,
    });

  console.log(`   - Events: ${eventError ? '❌ Bloqué' : '✅ Autorisé'}`);

  console.log('\n⚠️  Note: Si les modifications sont autorisées, nous devons implémenter les restrictions côté client.');
} else {
  console.log('❌ Aucun projet archivé trouvé pour tester.');
}

// Récupérer les projets actifs vs archivés
const { data: stats } = await supabase
  .from('projects')
  .select('archived_at, deleted_at');

const active = stats.filter(p => !p.archived_at && !p.deleted_at).length;
const archived = stats.filter(p => p.archived_at && !p.deleted_at).length;
const deleted = stats.filter(p => p.deleted_at).length;

console.log('\n📊 Statistiques:');
console.log(`   - Projets actifs: ${active}`);
console.log(`   - Projets archivés: ${archived}`);
console.log(`   - Projets supprimés: ${deleted}`);