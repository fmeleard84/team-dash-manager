#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testKanbanFilesInsertion() {
  console.log('🧪 Test d\'insertion dans kanban_files...\n');

  // 1. Récupérer un projet existant avec status 'play' et une IA
  console.log('📋 Recherche d\'un projet avec IA...');
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      hr_resource_assignments!inner (
        profile_id,
        hr_profiles!inner (
          name,
          is_ai
        )
      )
    `)
    .eq('status', 'play')
    .eq('hr_resource_assignments.hr_profiles.is_ai', true)
    .limit(1);

  if (projectError) {
    console.error('❌ Erreur récupération projet:', projectError);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('⚠️ Aucun projet avec IA trouvé');
    return;
  }

  const project = projects[0];
  console.log('✅ Projet trouvé:', project.title, '(ID:', project.id, ')');

  // 2. Préparer les données de test
  const testFileName = `test_document_${Date.now()}.docx`;
  const testFilePath = `projects/${project.id}/IA/${testFileName}`;

  const fileData = {
    project_id: project.id,
    file_name: testFileName,
    file_path: testFilePath,
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 1024, // 1KB test
    uploaded_by: 'ai-system', // UUID ou 'ai-system'
    uploaded_at: new Date().toISOString(),
    folder_path: `projects/${project.id}/IA`,
    is_ai_generated: true,
    ai_member_name: 'IA Test',
    content_type: 'document',
    metadata: {
      title: 'Document de test',
      generated_at: new Date().toISOString(),
      source: 'ai-conversation'
    }
  };

  console.log('\n📝 Données à insérer:');
  console.log(JSON.stringify(fileData, null, 2));

  // 3. Tenter l'insertion
  console.log('\n💾 Tentative d\'insertion...');
  const { data: insertedFile, error: insertError } = await supabase
    .from('kanban_files')
    .insert(fileData)
    .select()
    .single();

  if (insertError) {
    console.error('\n❌ Erreur insertion:', insertError);
    console.error('🔍 Détails erreur:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    });

    // Vérifier la structure de la table
    console.log('\n📊 Vérification de la structure de la table kanban_files...');
    const { data: columns, error: schemaError } = await supabase.rpc('get_table_columns', {
      p_table_name: 'kanban_files'
    });

    if (columns) {
      console.log('Colonnes disponibles:', columns);
    }
  } else {
    console.log('\n✅ Insertion réussie!');
    console.log('📄 Fichier créé:', insertedFile);

    // 4. Nettoyer (supprimer le fichier de test)
    console.log('\n🧹 Nettoyage...');
    const { error: deleteError } = await supabase
      .from('kanban_files')
      .delete()
      .eq('id', insertedFile.id);

    if (deleteError) {
      console.error('⚠️ Erreur suppression:', deleteError);
    } else {
      console.log('✅ Fichier de test supprimé');
    }
  }
}

// Exécuter le test
testKanbanFilesInsertion().catch(console.error);