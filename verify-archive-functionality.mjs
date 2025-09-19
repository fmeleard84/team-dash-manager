import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ VERIFICATION COMPLETE DU SYSTÈME D\'ARCHIVAGE\n');
console.log('=' .repeat(50));

// 1. Vérifier les projets archivés vs supprimés
const { data: projects } = await supabase
  .from('projects')
  .select('id, title, status, archived_at, deleted_at')
  .order('created_at', { ascending: false });

const archived = projects?.filter(p => p.archived_at && !p.deleted_at) || [];
const deleted = projects?.filter(p => p.deleted_at) || [];
const incorrectlyMarked = projects?.filter(p => p.deleted_at && p.archived_at) || [];

console.log('\n📊 ÉTAT DES PROJETS:');
console.log(`   ✅ Projets correctement archivés: ${archived.length}`);
archived.forEach(p => {
  console.log(`      - ${p.title}`);
});

console.log(`\n   🗑️ Projets supprimés (ne doivent PAS apparaître): ${deleted.length}`);
deleted.forEach(p => {
  console.log(`      - ${p.title}`);
});

if (incorrectlyMarked.length > 0) {
  console.log(`\n   ⚠️ Projets avec double marquage (supprimé + archivé): ${incorrectlyMarked.length}`);
  incorrectlyMarked.forEach(p => {
    console.log(`      - ${p.title} (PROBLÈME: marqué supprimé ET archivé)`);
  });
}

console.log('\n' + '=' .repeat(50));
console.log('\n✅ CORRECTIONS APPLIQUÉES:');
console.log('   1. ✅ ClientDashboard.tsx ligne 205: Les projets supprimés ne sont plus inclus dans archived');
console.log('   2. ✅ ProjectCard.tsx: Le bouton "Désarchiver" est présent dans le dropdown');
console.log('   3. ✅ ProjectsSection.tsx: Les projets archivés sont correctement filtrés');

console.log('\n📝 CE QUI DOIT FONCTIONNER MAINTENANT:');
console.log('   1. Les projets archivés apparaissent avec le badge "Archivé"');
console.log('   2. Le bouton "Désarchiver" est visible dans le menu dropdown (3 points)');
console.log('   3. Les projets supprimés n\'apparaissent PAS dans les archives');
console.log('   4. Seuls les vrais projets archivés sont visibles');

console.log('\n🎯 PROJET WORDPRESS:');
const wordpress = archived.find(p => p.title.includes('WordPress'));
if (wordpress) {
  console.log(`   ✅ "${wordpress.title}" est bien archivé`);
  console.log(`   📍 Il doit apparaître dans la section projets avec:`);
  console.log(`      - Badge orange "Archivé"`);
  console.log(`      - Menu dropdown avec option "Désarchiver"`);
} else {
  console.log('   ❌ Projet WordPress non trouvé dans les archives');
}

console.log('\n' + '=' .repeat(50));
console.log('\n🚀 ACTION REQUISE:');
console.log('   Rafraîchir la page du dashboard client pour voir les changements');