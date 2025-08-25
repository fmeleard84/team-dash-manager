import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function fixStorageAndFindInvoice() {
  const projectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2'; // Test RT2
  
  // First, try to create the bucket
  console.log('Creating project-files bucket...');
  const { data: bucketData, error: bucketError } = await supabase.storage
    .createBucket('project-files', {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
  
  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log('✅ Bucket already exists');
    } else {
      console.log('Bucket creation error:', bucketError.message);
    }
  } else {
    console.log('✅ Bucket created successfully');
  }
  
  // Now try to list files in the project folder
  const projectPath = `project/${projectId}`;
  console.log(`\nListing files in: ${projectPath}/`);
  
  const { data: files, error: listError } = await supabase.storage
    .from('project-files')
    .list(projectPath, {
      limit: 100,
      offset: 0
    });
  
  if (listError) {
    console.log('Error listing files:', listError.message);
  } else if (files && files.length > 0) {
    console.log(`Found ${files.length} files:`);
    files.forEach(file => {
      console.log(`  - ${file.name} (${file.metadata?.size || 0} bytes, created: ${file.created_at})`);
      
      // Check if this is the Invoice file
      if (file.name.includes('Invoice')) {
        console.log(`  ✅ FOUND INVOICE FILE: ${file.name}`);
      }
    });
  } else {
    console.log('No files found in this project folder');
    
    // Try without the 'project/' prefix
    console.log(`\nTrying with just project ID: ${projectId}/`);
    const { data: altFiles, error: altError } = await supabase.storage
      .from('project-files')
      .list(projectId, {
        limit: 100,
        offset: 0
      });
    
    if (altFiles && altFiles.length > 0) {
      console.log(`Found ${altFiles.length} files in alternate path:`);
      altFiles.forEach(file => {
        console.log(`  - ${file.name}`);
        if (file.name.includes('Invoice')) {
          console.log(`  ✅ FOUND INVOICE FILE: ${file.name}`);
        }
      });
    } else {
      console.log('No files in alternate path either');
    }
  }
  
  // Also check the root of the bucket
  console.log('\nChecking root of project-files bucket...');
  const { data: rootFiles, error: rootError } = await supabase.storage
    .from('project-files')
    .list('', {
      limit: 20,
      offset: 0
    });
  
  if (rootFiles && rootFiles.length > 0) {
    console.log('Items in root:');
    rootFiles.forEach(item => {
      console.log(`  - ${item.name} (${item.id ? 'file' : 'folder'})`);
    });
  } else {
    console.log('Nothing in root');
  }
}

fixStorageAndFindInvoice();