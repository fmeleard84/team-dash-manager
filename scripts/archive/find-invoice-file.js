import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function findInvoiceFile() {
  const fileName = 'Invoice-Z4DR9ARB-0004.pdf';
  const projectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2'; // Test RT2
  
  console.log('Searching for file:', fileName);
  console.log('Project ID:', projectId);
  console.log('-----------------------------------\n');
  
  // Check in project-files storage bucket
  console.log('1. Checking project-files bucket...');
  
  // Try different path patterns
  const pathsToCheck = [
    '', // root
    projectId, // project ID folder
    `${projectId}/`, // project ID folder with slash
    'projects', // projects folder
    `projects/${projectId}`, // projects/projectId
  ];
  
  for (const path of pathsToCheck) {
    const { data: files, error } = await supabase.storage
      .from('project-files')
      .list(path, { limit: 100, offset: 0 });
    
    if (files && files.length > 0) {
      console.log(`  Found ${files.length} items in path: "${path}"`);
      const invoiceFile = files.find(f => f.name.includes('Invoice'));
      if (invoiceFile) {
        console.log(`  ✅ FOUND INVOICE FILE:`, invoiceFile);
      }
    }
  }
  
  // Check in kanban-files storage bucket
  console.log('\n2. Checking kanban-files bucket...');
  for (const path of pathsToCheck) {
    const { data: files, error } = await supabase.storage
      .from('kanban-files')
      .list(path, { limit: 100, offset: 0 });
    
    if (files && files.length > 0) {
      console.log(`  Found ${files.length} items in path: "${path}"`);
      const invoiceFile = files.find(f => f.name.includes('Invoice'));
      if (invoiceFile) {
        console.log(`  ✅ FOUND INVOICE FILE:`, invoiceFile);
      }
    }
  }
  
  // Check ALL storage buckets
  console.log('\n3. Listing all storage buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (buckets) {
    console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    
    // Check each bucket for the invoice file
    for (const bucket of buckets) {
      if (bucket.name === 'project-files' || bucket.name === 'kanban-files') continue; // already checked
      
      console.log(`\n  Checking bucket: ${bucket.name}`);
      const { data: files } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 100, offset: 0 });
      
      if (files && files.length > 0) {
        console.log(`    Found ${files.length} items`);
        const invoiceFile = files.find(f => f.name.includes('Invoice'));
        if (invoiceFile) {
          console.log(`    ✅ FOUND INVOICE FILE IN ${bucket.name}:`, invoiceFile);
        }
        
        // Also check in project subfolder
        const { data: projectFiles } = await supabase.storage
          .from(bucket.name)
          .list(projectId, { limit: 100, offset: 0 });
        
        if (projectFiles && projectFiles.length > 0) {
          console.log(`    Found ${projectFiles.length} items in project folder`);
          const invoiceInProject = projectFiles.find(f => f.name.includes('Invoice'));
          if (invoiceInProject) {
            console.log(`    ✅ FOUND INVOICE FILE IN ${bucket.name}/${projectId}:`, invoiceInProject);
          }
        }
      }
    }
  }
  
  // Check in database tables
  console.log('\n4. Checking database tables...');
  
  // Check project_files table
  const { data: projectFiles } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId);
  
  console.log(`  project_files table: ${projectFiles?.length || 0} files`);
  if (projectFiles) {
    projectFiles.forEach(f => console.log(`    - ${f.file_name}`));
  }
  
  // Check kanban_cards for attachments
  const { data: kanbanCards } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('project_id', projectId);
  
  console.log(`  kanban_cards for project: ${kanbanCards?.length || 0} cards`);
  if (kanbanCards) {
    kanbanCards.forEach(card => {
      if (card.attachments && card.attachments.length > 0) {
        console.log(`    Card "${card.title}" has attachments:`, card.attachments);
      }
    });
  }
}

findInvoiceFile();