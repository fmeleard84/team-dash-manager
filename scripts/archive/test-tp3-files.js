import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testTP3Files() {
  const projectId = '3baf1341-3476-494f-aa7d-c634a7d02b3f'; // TP3
  
  console.log('🔍 Test des fichiers TP3\n');
  
  try {
    // 1. Créer un fichier test dans Messagerie
    console.log('1️⃣ Création d\'un fichier test dans Messagerie...');
    const testContent = 'Test message file';
    const testPath = `project/${projectId}/Messagerie/test-message.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(testPath, new Blob([testContent]), { upsert: true });
    
    if (uploadError) {
      console.error('Erreur upload:', uploadError);
    } else {
      console.log('✅ Fichier créé dans Messagerie');
    }
    
    // 2. Lister le contenu du projet
    console.log('\n2️⃣ Liste du contenu du projet...');
    const basePath = `project/${projectId}`;
    
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('project-files')
      .list(basePath, { limit: 100 });
    
    if (rootError) {
      console.error('Erreur listing racine:', rootError);
    } else {
      console.log(`\nContenu de ${basePath}:`);
      if (rootFiles && rootFiles.length > 0) {
        console.log(`  Total: ${rootFiles.length} éléments`);
        
        for (const item of rootFiles) {
          if (item.id) {
            console.log(`  📄 ${item.name} (fichier)`);
          } else {
            console.log(`  📁 ${item.name}/ (dossier)`);
            
            // Lister le contenu du dossier
            const { data: subFiles } = await supabase.storage
              .from('project-files')
              .list(`${basePath}/${item.name}`, { limit: 100 });
            
            if (subFiles && subFiles.length > 0) {
              for (const subItem of subFiles) {
                if (!subItem.name.startsWith('.')) {
                  console.log(`      └─ ${subItem.name}`);
                }
              }
            }
          }
        }
      } else {
        console.log('  📭 Vide');
      }
    }
    
    // 3. Test de list sans préfixe
    console.log('\n3️⃣ Test de list depuis la racine du bucket...');
    const { data: allFiles, error: allError } = await supabase.storage
      .from('project-files')
      .list('', { limit: 20 });
    
    if (!allError && allFiles) {
      console.log(`\nPremiers éléments du bucket:`);
      for (const item of allFiles.slice(0, 10)) {
        console.log(`  • ${item.name}${item.id ? '' : '/'}`);
      }
    }
    
  } catch (err) {
    console.error('Erreur générale:', err);
  }
}

testTP3Files();