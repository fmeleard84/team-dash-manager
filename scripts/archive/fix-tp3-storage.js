import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function fixTP3Storage() {
  const projectId = '3baf1341-3476-494f-aa7d-c634a7d02b3f'; // TP3
  
  console.log('🔧 Correction de la structure de stockage pour TP3\n');
  
  try {
    // Appeler la fonction de correction
    const { data, error } = await supabase.functions.invoke('fix-project-storage', {
      body: {
        projectId: projectId
      }
    });
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log('✅ Résultat:', JSON.stringify(data, null, 2));
    
    // Vérifier la nouvelle structure
    console.log('\n📊 Vérification de la structure après correction:');
    const basePath = `project/${projectId}`;
    
    const { data: files, error: listError } = await supabase.storage
      .from('project-files')
      .list(basePath, {
        limit: 100,
        offset: 0
      });
    
    if (listError) {
      console.error('Erreur listing:', listError);
      return;
    }
    
    console.log(`\n📁 Contenu de ${basePath}:`);
    if (files && files.length > 0) {
      const folders = files.filter(f => !f.id);
      const regularFiles = files.filter(f => f.id && !f.name.startsWith('.'));
      
      console.log(`  • ${folders.length} dossiers`);
      console.log(`  • ${regularFiles.length} fichiers`);
      
      if (folders.length > 0) {
        console.log('\n  Dossiers:');
        for (const folder of folders) {
          // Compter les éléments dans chaque dossier
          const { data: subFiles } = await supabase.storage
            .from('project-files')
            .list(`${basePath}/${folder.name}`, { limit: 100 });
          
          const count = subFiles ? subFiles.filter(f => !f.name.startsWith('.')).length : 0;
          console.log(`    📁 ${folder.name}/ (${count} éléments)`);
        }
      }
      
      if (regularFiles.length > 0) {
        console.log('\n  Fichiers à la racine:');
        for (const file of regularFiles.slice(0, 5)) {
          console.log(`    📄 ${file.name}`);
        }
        if (regularFiles.length > 5) {
          console.log(`    ... et ${regularFiles.length - 5} autres fichiers`);
        }
      }
    } else {
      console.log('  📭 Vide');
    }
    
  } catch (err) {
    console.error('Erreur générale:', err);
  }
}

fixTP3Storage();