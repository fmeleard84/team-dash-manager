#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

async function checkEdgeFunctionHealth() {
  console.log('🔍 Vérification de l\'Edge Function save-ai-content-to-drive...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Vérifier que le bucket kanban-files existe et est accessible
  console.log('📦 1. Vérification du bucket kanban-files...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

  if (bucketError) {
    console.error('❌ Erreur listage buckets:', bucketError);
  } else {
    const kanbanBucket = buckets.find(b => b.name === 'kanban-files');
    if (kanbanBucket) {
      console.log('✅ Bucket kanban-files trouvé:', kanbanBucket);
    } else {
      console.log('⚠️ Bucket kanban-files non trouvé!');
    }
  }

  // 2. Vérifier la structure de la table kanban_files
  console.log('\n📊 2. Vérification de la table kanban_files...');
  const { data: sampleRow, error: tableError } = await supabase
    .from('kanban_files')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Erreur accès table kanban_files:', tableError);
  } else {
    console.log('✅ Table kanban_files accessible');
    if (sampleRow && sampleRow.length > 0) {
      console.log('Colonnes disponibles:', Object.keys(sampleRow[0]));
    }
  }

  // 3. Vérifier spécifiquement la colonne uploaded_by
  console.log('\n🔑 3. Vérification de la colonne uploaded_by...');
  const { data: nullTest, error: nullError } = await supabase
    .from('kanban_files')
    .insert({
      project_id: 'd2c755c5-8ef7-4bac-830f-1750a6cc6b9c',
      file_name: 'test_null_' + Date.now() + '.txt',
      file_path: 'test/test.txt',
      file_type: 'text/plain',
      file_size: 100,
      uploaded_by: null, // Test avec NULL
      folder_path: 'test',
      is_ai_generated: true
    })
    .select()
    .single();

  if (nullError) {
    console.error('❌ Erreur insertion avec uploaded_by=null:', nullError.message);

    // Essayer avec une string vide
    const { data: emptyTest, error: emptyError } = await supabase
      .from('kanban_files')
      .insert({
        project_id: 'd2c755c5-8ef7-4bac-830f-1750a6cc6b9c',
        file_name: 'test_empty_' + Date.now() + '.txt',
        file_path: 'test/test.txt',
        file_type: 'text/plain',
        file_size: 100,
        uploaded_by: 'ai-system', // Test avec une string
        folder_path: 'test',
        is_ai_generated: true
      })
      .select()
      .single();

    if (emptyError) {
      console.error('❌ Erreur insertion avec uploaded_by="ai-system":', emptyError.message);
    } else {
      console.log('✅ Insertion réussie avec uploaded_by="ai-system"');
      // Nettoyer
      await supabase.from('kanban_files').delete().eq('id', emptyTest.id);
    }
  } else {
    console.log('✅ Insertion réussie avec uploaded_by=null');
    // Nettoyer
    await supabase.from('kanban_files').delete().eq('id', nullTest.id);
  }

  // 4. Vérifier les politiques RLS
  console.log('\n🛡️ 4. Vérification des politiques RLS...');
  const { data: policies } = await supabase
    .rpc('get_rls_policies', { table_name: 'kanban_files' })
    .catch(() => ({ data: null }));

  if (policies) {
    console.log('Politiques RLS trouvées:', policies.length);
  } else {
    console.log('⚠️ Impossible de vérifier les politiques RLS');
  }
}

// Exécuter le test
checkEdgeFunctionHealth().catch(console.error);