import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📊 Vérification de tous les projets...\n');

// Récupérer TOUS les projets
const { data: projects, error } = await supabase
  .from('projects')
  .select('id, title, status, archived_at, deleted_at, owner_id')
  .order('created_at', { ascending: false });

if (error) {
  console.log('❌ Erreur:', error.message);
  process.exit(1);
}

console.log(`Total: ${projects.length} projets\n`);

// Catégoriser les projets
const active = projects.filter(p => !p.archived_at && !p.deleted_at);
const archived = projects.filter(p => p.archived_at && !p.deleted_at);
const deleted = projects.filter(p => p.deleted_at);

console.log('✅ PROJETS ACTIFS:', active.length);
active.forEach(p => {
  console.log(`   - ${p.title}`);
  console.log(`     ID: ${p.id}`);
  console.log(`     Statut: ${p.status}`);
});

console.log('\n📦 PROJETS ARCHIVÉS:', archived.length);
archived.forEach(p => {
  console.log(`   - ${p.title}`);
  console.log(`     ID: ${p.id}`);
  console.log(`     Archivé le: ${new Date(p.archived_at).toLocaleDateString()}`);
});

console.log('\n🗑️ PROJETS SUPPRIMÉS:', deleted.length);
deleted.forEach(p => {
  console.log(`   - ${p.title}`);
  console.log(`     ID: ${p.id}`);
  console.log(`     Supprimé le: ${new Date(p.deleted_at).toLocaleDateString()}`);
  if (p.archived_at) {
    console.log(`     ⚠️ AUSSI archivé le: ${new Date(p.archived_at).toLocaleDateString()}`);
  }
});

// Recherche spécifique
console.log('\n🔍 Recherche "Gestion Site Web WordPress"...');
const wordpress = projects.find(p => p.title.includes('WordPress') || p.title.includes('Gestion Site Web'));
if (wordpress) {
  console.log('   ✅ Trouvé !');
  console.log('   Titre:', wordpress.title);
  console.log('   ID:', wordpress.id);
  console.log('   Statut:', wordpress.status);
  console.log('   Archivé:', wordpress.archived_at ? new Date(wordpress.archived_at).toLocaleDateString() : 'Non');
  console.log('   Supprimé:', wordpress.deleted_at ? new Date(wordpress.deleted_at).toLocaleDateString() : 'Non');
} else {
  console.log('   ❌ Non trouvé');
}