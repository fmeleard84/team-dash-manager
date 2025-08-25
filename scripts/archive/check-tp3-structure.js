import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.SJr7x-Ad-TpQX3cCMWJBaqMYBsUqLQVAg6RQ4sFvN8s';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkTP3Structure() {
  console.log('🔍 Analyse de la structure TP3...\n');
  
  const projectId = '3baf1341-3476-494f-aa7d-c634a7d02b3f'; // TP3
  const basePath = `project/${projectId}`;
  
  try {
    // Liste récursive pour voir toute la structure
    console.log('📁 Structure complète du projet TP3:\n');
    
    async function listRecursive(path, indent = '') {
      const { data: files, error } = await supabase.storage
        .from('project-files')
        .list(path, { limit: 100 });
      
      if (error) {
        console.log(`${indent}❌ Erreur: ${error.message}`);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log(`${indent}📭 Vide`);
        return;
      }
      
      for (const file of files) {
        if (file.id) {
          // C'est un fichier
          const size = file.metadata?.size ? `(${(file.metadata.size / 1024).toFixed(1)} KB)` : '';
          console.log(`${indent}📄 ${file.name} ${size}`);
        } else {
          // C'est un dossier
          console.log(`${indent}📁 ${file.name}/`);
          // Récursion pour lister le contenu du dossier
          await listRecursive(`${path}/${file.name}`, indent + '  ');
        }
      }
    }
    
    await listRecursive(basePath);
    
    // Vérifier aussi s'il y a un dossier "project" parasite
    console.log('\n🔍 Recherche de dossiers parasites...');
    const { data: rootFiles } = await supabase.storage
      .from('project-files')
      .list(basePath, { limit: 100 });
    
    const projectFolder = rootFiles?.find(f => f.name === 'project' && !f.id);
    if (projectFolder) {
      console.log('⚠️ TROUVÉ: Dossier "project" parasite dans', basePath);
      
      // Vérifier son contenu
      const { data: projectContent } = await supabase.storage
        .from('project-files')
        .list(`${basePath}/project`, { limit: 100 });
      
      if (projectContent && projectContent.length > 0) {
        console.log('  Contenu du dossier parasite:');
        for (const item of projectContent) {
          console.log(`    - ${item.name}`);
        }
      }
    }
    
    // Vérifier s'il y a une mauvaise structure avec l'ID répété
    console.log('\n🔍 Vérification de structures avec ID répété...');
    const wrongPath = `project/${projectId}/${projectId}`;
    const { data: wrongFiles } = await supabase.storage
      .from('project-files')
      .list(wrongPath, { limit: 100 });
    
    if (wrongFiles && wrongFiles.length > 0) {
      console.log(`⚠️ TROUVÉ: Structure incorrecte dans ${wrongPath}`);
      console.log('  Contenu:', wrongFiles.map(f => f.name).join(', '));
    }
    
    // Vérifier le dossier parent "project"
    console.log('\n🔍 Contenu du dossier "project" racine:');
    const { data: projectRoot } = await supabase.storage
      .from('project-files')
      .list('project', { limit: 100 });
    
    if (projectRoot) {
      const folders = projectRoot.filter(f => !f.id);
      const files = projectRoot.filter(f => f.id);
      console.log(`  • ${folders.length} dossiers de projets`);
      console.log(`  • ${files.length} fichiers`);
      
      if (folders.length > 0) {
        console.log('\n  Projets trouvés:');
        for (const folder of folders) {
          const isTP3 = folder.name === projectId;
          console.log(`    ${isTP3 ? '➡️' : '  '} ${folder.name}${isTP3 ? ' (TP3)' : ''}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

checkTP3Structure();