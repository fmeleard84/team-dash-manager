import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function initProjectStorage() {
  const projectId = '98007f64-f647-4ed9-b004-7daa1f06b373'; // dir marketing new
  const projectTitle = 'dir marketing new';
  
  console.log(`🚀 Initialisation du stockage pour le projet: ${projectTitle}`);
  
  try {
    // Appeler la fonction edge pour initialiser le stockage
    const { data, error } = await supabase.functions.invoke('init-project-storage', {
      body: {
        projectId: projectId,
        projectTitle: projectTitle,
        resourceCategories: ['Marketing'] // Catégorie du directeur marketing
      }
    });
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log('✅ Réponse:', data);
    
    // Vérifier la structure créée
    console.log('\n📊 Vérification de la structure créée:');
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
          console.log(`    📁 ${folder.name}/`);
        }
      }
    } else {
      console.log('  📭 Vide');
    }
    
  } catch (err) {
    console.error('Erreur générale:', err);
  }
}

initProjectStorage();