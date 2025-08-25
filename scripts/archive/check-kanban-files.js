import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkKanbanFiles() {
  // Find Test RT2 project
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, title')
    .eq('title', 'Test RT2')
    .single();
  
  if (!project) {
    console.log('Project Test RT2 not found');
    return;
  }
  
  console.log('Found project:', project);
  
  // Find kanban cards for this project
  const { data: cards, error: cardsError } = await supabase
    .from('kanban_cards')
    .select('id, title, column_id')
    .eq('project_id', project.id);
  
  console.log('Kanban cards for project:', cards?.length || 0);
  
  if (cards && cards.length > 0) {
    for (const card of cards) {
      console.log('\nCard:', card.title, '(ID:', card.id, ')');
      
      // Check files in storage for this card
      const { data: files, error: filesError } = await supabase.storage
        .from('kanban-files')
        .list(`cards/${card.id}`, {
          limit: 100,
          offset: 0
        });
      
      if (files && files.length > 0) {
        console.log('  Files found:', files.length);
        files.forEach(file => {
          console.log('    -', file.name, '(size:', file.metadata?.size || 0, 'bytes)');
        });
      } else {
        console.log('  No files found for this card');
      }
    }
  }
  
  // Also check if files are stored directly under project ID
  console.log('\nChecking files under project ID directly...');
  const { data: projectFiles, error: projectFilesError } = await supabase.storage
    .from('kanban-files')
    .list(`cards/${project.id}`, {
      limit: 100,
      offset: 0
    });
  
  if (projectFiles && projectFiles.length > 0) {
    console.log('Files found under project ID:', projectFiles.length);
    projectFiles.forEach(file => {
      console.log('  -', file.name);
    });
  } else {
    console.log('No files found under project ID');
  }
  
  // Check the root of kanban-files bucket
  console.log('\nChecking root of kanban-files bucket...');
  const { data: rootFiles, error: rootError } = await supabase.storage
    .from('kanban-files')
    .list('', {
      limit: 20,
      offset: 0
    });
  
  if (rootFiles && rootFiles.length > 0) {
    console.log('Folders/files in root:', rootFiles.length);
    rootFiles.forEach(item => {
      console.log('  -', item.name, '(type:', item.id ? 'file' : 'folder', ')');
    });
  }
}

checkKanbanFiles();