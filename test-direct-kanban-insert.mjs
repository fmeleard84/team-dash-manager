#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDirectInsertion() {
  console.log('🧪 Test direct d\'insertion dans kanban_files...\n');

  // Utiliser le projet ID que vous avez dans les logs
  const projectId = 'd2c755c5-8ef7-4bac-830f-1750a6cc6b9c';
  const userId = '771a8efe-5a0d-4a7c-86a0-1881784f8850'; // Francis

  // 1. Vérifier d'abord les RLS sur kanban_files
  console.log('🔍 Vérification des politiques RLS...');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('check_rls_policies', { table_name: 'kanban_files' });

    if (policies) {
      console.log('Politiques RLS:', policies);
    } else {
      console.log('⚠️ Impossible de vérifier les RLS (continuons)');
    }
  } catch (e) {
    console.log('⚠️ RPC non disponible (continuons)');
  }

  // 2. Vérifier les colonnes de la table
  console.log('\n📊 Vérification de la structure de la table...');
  const { data: tableInfo, error: tableError } = await supabase
    .from('kanban_files')
    .select('*')
    .limit(0);

  if (tableError) {
    console.error('❌ Erreur accès table:', tableError);
    return;
  }

  console.log('✅ Table accessible');

  // 3. Tester l'insertion avec uploaded_by = null
  console.log('\n💾 Test 1: Insertion avec uploaded_by = null...');
  const testData1 = {
    project_id: projectId,
    file_name: `test_null_user_${Date.now()}.docx`,
    file_path: `projects/${projectId}/IA/test_null_user.docx`,
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 1024,
    uploaded_by: null, // NULL pour IA
    uploaded_at: new Date().toISOString(),
    folder_path: `projects/${projectId}/IA`,
    is_ai_generated: true,
    ai_member_name: 'Concepteur rédacteur IA'
  };

  const { data: result1, error: error1 } = await supabase
    .from('kanban_files')
    .insert(testData1)
    .select()
    .single();

  if (error1) {
    console.error('❌ Erreur avec uploaded_by=null:', error1.message);
    console.log('Détails:', error1.details, error1.hint);
  } else {
    console.log('✅ Insertion réussie avec uploaded_by=null');
    console.log('ID créé:', result1.id);

    // Nettoyer
    await supabase.from('kanban_files').delete().eq('id', result1.id);
    console.log('🧹 Nettoyé');
  }

  // 4. Tester avec uploaded_by = userId
  console.log('\n💾 Test 2: Insertion avec uploaded_by = userId...');
  const testData2 = {
    project_id: projectId,
    file_name: `test_user_${Date.now()}.docx`,
    file_path: `projects/${projectId}/IA/test_user.docx`,
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 1024,
    uploaded_by: userId, // UUID utilisateur
    uploaded_at: new Date().toISOString(),
    folder_path: `projects/${projectId}/IA`,
    is_ai_generated: true,
    ai_member_name: 'Concepteur rédacteur IA'
  };

  const { data: result2, error: error2 } = await supabase
    .from('kanban_files')
    .insert(testData2)
    .select()
    .single();

  if (error2) {
    console.error('❌ Erreur avec uploaded_by=userId:', error2.message);
    console.log('Détails:', error2.details, error2.hint);
  } else {
    console.log('✅ Insertion réussie avec uploaded_by=userId');
    console.log('ID créé:', result2.id);

    // Nettoyer
    await supabase.from('kanban_files').delete().eq('id', result2.id);
    console.log('🧹 Nettoyé');
  }

  // 5. Vérifier les fichiers existants dans ce projet
  console.log('\n📂 Vérification des fichiers existants dans le projet...');
  const { data: existingFiles, error: filesError } = await supabase
    .from('kanban_files')
    .select('id, file_name, folder_path, is_ai_generated, ai_member_name, uploaded_by, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (existingFiles && existingFiles.length > 0) {
    console.log(`\n✅ ${existingFiles.length} fichier(s) trouvé(s):`);
    existingFiles.forEach(file => {
      console.log(`  - ${file.file_name} (IA: ${file.is_ai_generated}, uploaded_by: ${file.uploaded_by})`);
    });
  } else {
    console.log('⚠️ Aucun fichier trouvé dans ce projet');
  }
}

// Exécuter le test
testDirectInsertion().catch(console.error);