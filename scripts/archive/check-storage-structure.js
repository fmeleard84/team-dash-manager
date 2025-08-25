import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkStorageStructure() {
  console.log('🔍 Vérification de la structure de stockage...\n');
  
  try {
    // Liste tous les projets
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (projectError) {
      console.error('Erreur récupération projets:', projectError);
      return;
    }
    
    console.log(`📁 ${projects.length} projets trouvés\n`);
    
    for (const project of projects) {
      console.log(`\n📂 Projet: ${project.title} (${project.id})`);
      console.log('─'.repeat(50));
      
      const basePath = `project/${project.id}`;
      
      // Liste le contenu du dossier projet
      const { data: files, error } = await supabase.storage
        .from('project-files')
        .list(basePath, {
          limit: 100,
          offset: 0
        });
      
      if (error) {
        console.log(`  ❌ Erreur: ${error.message}`);
        continue;
      }
      
      if (!files || files.length === 0) {
        console.log('  📭 Dossier vide ou inexistant');
        continue;
      }
      
      // Organise par type
      const folders = files.filter(f => !f.id);
      const regularFiles = files.filter(f => f.id && !f.name.startsWith('.'));
      const placeholders = files.filter(f => f.name.startsWith('.emptyFolderPlaceholder') || f.name.startsWith('.keep'));
      
      console.log(`  📊 Contenu:`);
      console.log(`     • ${folders.length} dossiers`);
      console.log(`     • ${regularFiles.length} fichiers`);
      console.log(`     • ${placeholders.length} placeholders`);
      
      if (folders.length > 0) {
        console.log('\n  📁 Dossiers:');
        for (const folder of folders) {
          // Compte les éléments dans chaque dossier
          const { data: subFiles } = await supabase.storage
            .from('project-files')
            .list(`${basePath}/${folder.name}`, {
              limit: 100
            });
          const count = subFiles ? subFiles.filter(f => !f.name.startsWith('.')).length : 0;
          console.log(`     • ${folder.name}/ (${count} éléments)`);
        }
      }
      
      if (regularFiles.length > 0) {
        console.log('\n  📄 Fichiers:');
        for (const file of regularFiles.slice(0, 5)) {
          const size = file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'N/A';
          console.log(`     • ${file.name} (${size})`);
        }
        if (regularFiles.length > 5) {
          console.log(`     ... et ${regularFiles.length - 5} autres fichiers`);
        }
      }
      
      if (placeholders.length > 0) {
        console.log('\n  🔸 Placeholders détectés:');
        for (const ph of placeholders) {
          console.log(`     • ${ph.name}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Vérification terminée');
    
  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkStorageStructure();