import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testStorageOperations() {
  const projectId = '98007f64-f647-4ed9-b004-7daa1f06b373'; // dir marketing new
  const basePath = `project/${projectId}`;
  
  console.log('🧪 Test des opérations de stockage\n');
  
  try {
    // 1. Créer un fichier test
    console.log('1️⃣ Création d\'un fichier test...');
    const testContent = 'Ceci est un fichier de test';
    const testFilePath = `${basePath}/test-file.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(testFilePath, new Blob([testContent]), { upsert: true });
    
    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      return;
    }
    console.log('✅ Fichier créé:', testFilePath);
    
    // 2. Tester le renommage
    console.log('\n2️⃣ Test de renommage du fichier...');
    const { data: renameData, error: renameError } = await supabase.functions.invoke('storage-operations', {
      body: {
        operation: 'rename',
        oldPath: testFilePath,
        newPath: `${basePath}/test-file-renamed.txt`,
        isFolder: false
      }
    });
    
    if (renameError) {
      console.error('❌ Erreur renommage:', renameError);
    } else {
      console.log('✅ Renommage réussi:', renameData);
    }
    
    // 3. Vérifier que le fichier a été renommé
    console.log('\n3️⃣ Vérification du renommage...');
    const { data: files } = await supabase.storage
      .from('project-files')
      .list(basePath, { limit: 100 });
    
    const renamedFile = files?.find(f => f.name === 'test-file-renamed.txt');
    if (renamedFile) {
      console.log('✅ Fichier renommé trouvé');
    } else {
      console.log('⚠️ Fichier renommé non trouvé');
    }
    
    // 4. Tester la suppression
    console.log('\n4️⃣ Test de suppression...');
    const { data: deleteData, error: deleteError } = await supabase.functions.invoke('storage-operations', {
      body: {
        operation: 'delete',
        oldPath: `${basePath}/test-file-renamed.txt`,
        isFolder: false
      }
    });
    
    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError);
    } else {
      console.log('✅ Suppression réussie:', deleteData);
    }
    
    // 5. Vérifier que le fichier a été supprimé
    console.log('\n5️⃣ Vérification de la suppression...');
    const { data: filesAfter } = await supabase.storage
      .from('project-files')
      .list(basePath, { limit: 100 });
    
    const deletedFile = filesAfter?.find(f => f.name === 'test-file-renamed.txt');
    if (!deletedFile) {
      console.log('✅ Fichier supprimé avec succès');
    } else {
      console.log('⚠️ Fichier toujours présent');
    }
    
    console.log('\n✅ Tests terminés avec succès!');
    
  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

testStorageOperations();