import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Recherche des projets archivés...\n');

// Chercher TOUS les projets avec archived_at non null
const { data: archivedProjects, error } = await supabase
  .from('projects')
  .select('id, title, archived_at, deleted_at, status, owner_id')
  .not('archived_at', 'is', null)
  .is('deleted_at', null);  // Seulement les archivés, pas les supprimés

if (error) {
  console.log('❌ Erreur:', error.message);
} else if (archivedProjects && archivedProjects.length > 0) {
  console.log(`✅ ${archivedProjects.length} projet(s) archivé(s) trouvé(s):\n`);
  
  archivedProjects.forEach(p => {
    console.log(`📦 ${p.title}`);
    console.log(`   - ID: ${p.id}`);
    console.log(`   - Statut: ${p.status}`);
    console.log(`   - Archivé le: ${new Date(p.archived_at).toLocaleDateString()}`);
    console.log(`   - Owner: ${p.owner_id}`);
    console.log('');
  });
} else {
  console.log('❌ Aucun projet archivé trouvé');
  
  // Cherchons TOUS les projets pour comprendre
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, title, archived_at, deleted_at, status')
    .limit(10);
    
  console.log('\n📊 État de tous les projets:');
  allProjects?.forEach(p => {
    const state = p.deleted_at ? 'SUPPRIMÉ' : p.archived_at ? 'ARCHIVÉ' : 'ACTIF';
    console.log(`- ${p.title}: ${state}`);
  });
}
