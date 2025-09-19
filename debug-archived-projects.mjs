import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Analyse des projets archivés...\n');

// Se connecter comme un utilisateur pour tester les RLS
const { data: { users } } = await supabase.auth.admin.listUsers();
const clientUser = users?.find(u => u.email?.includes('client') || u.user_metadata?.role === 'client');

if (clientUser) {
  console.log('👤 Client trouvé:', clientUser.email);

  // Récupérer les projets du client
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', clientUser.id);

  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log(`\n📊 Total projets du client: ${projects.length}`);

    const archived = projects.filter(p => p.archived_at && !p.deleted_at);
    const active = projects.filter(p => !p.archived_at && !p.deleted_at);

    console.log(`   - Actifs: ${active.length}`);
    console.log(`   - Archivés: ${archived.length}`);

    if (archived.length > 0) {
      console.log('\n📦 Projets archivés:');
      archived.forEach(p => {
        console.log(`\n   "${p.title}"`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Archivé le: ${new Date(p.archived_at).toLocaleDateString()}`);
        console.log(`   ➡️ Ce projet devrait avoir isArchived=true`);
        console.log(`   ➡️ Le bouton "Désarchiver" devrait apparaître`);
      });
    } else {
      console.log('\n⚠️ Aucun projet archivé trouvé');
    }
  }
} else {
  console.log('❌ Aucun utilisateur client trouvé');
}

console.log('\n💡 DEBUG: Pour voir si le bouton apparaît:');
console.log('   1. Vérifier que ProjectsSection passe bien isArchived={project.category === "archived"}');
console.log('   2. Dans ProjectCard, vérifier que isArchived est true pour ces projets');
console.log('   3. Dans le menu dropdown, le bouton "Désarchiver" devrait être visible');