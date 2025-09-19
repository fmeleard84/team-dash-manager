import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Vérification via Edge Function...\n');

const { data, error } = await supabase.functions.invoke('check-projects-status');

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('📊 Résumé:');
console.log(`   Total: ${data.summary.total} projets`);
console.log(`   Actifs: ${data.summary.active}`);
console.log(`   Archivés: ${data.summary.archived}`);
console.log(`   Supprimés: ${data.summary.deleted}`);

if (data.projects.active.length > 0) {
  console.log('\n✅ Projets actifs:');
  data.projects.active.forEach(p => {
    console.log(`   - ${p.title} (${p.status})`);
  });
}

if (data.projects.archived.length > 0) {
  console.log('\n📦 Projets archivés:');
  data.projects.archived.forEach(p => {
    console.log(`   - ${p.title}`);
  });
}

if (data.projects.deleted.length > 0) {
  console.log('\n🗑️ Projets supprimés:');
  data.projects.deleted.forEach(p => {
    console.log(`   - ${p.title}`);
    if (p.also_archived) {
      console.log(`     ⚠️ Aussi marqué comme archivé`);
    }
  });
}

if (data.wordpress_project) {
  console.log('\n🎯 Projet WordPress trouvé:');
  console.log(`   Titre: ${data.wordpress_project.title}`);
  console.log(`   ID: ${data.wordpress_project.id}`);
  console.log(`   Statut: ${data.wordpress_project.status}`);
  console.log(`   Archivé: ${data.wordpress_project.archived_at ? 'Oui' : 'Non'}`);
  console.log(`   Supprimé: ${data.wordpress_project.deleted_at ? 'Oui' : 'Non'}`);
} else {
  console.log('\n❌ Projet WordPress non trouvé');
}