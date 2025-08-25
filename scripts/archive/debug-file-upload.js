import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function debugFiles() {
  // Check project_files table structure
  console.log('Checking project_files table...');
  const { data: files, error: filesError } = await supabase
    .from('project_files')
    .select('*')
    .limit(5);
  
  if (filesError) {
    console.log('Error accessing project_files:', filesError.message);
    console.log('Full error:', filesError);
  } else {
    console.log('project_files count:', files?.length || 0);
    if (files && files.length > 0) {
      console.log('Sample file structure:', files[0]);
    }
  }
  
  // Check if table exists with a count query
  const { count, error: countError } = await supabase
    .from('project_files')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.log('Count error:', countError.message);
  } else {
    console.log('Total records in project_files:', count);
  }
  
  // Check storage bucket project-files
  console.log('\nChecking project-files storage bucket...');
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('project-files')
    .list('', {
      limit: 20,
      offset: 0
    });
  
  if (storageError) {
    console.log('Storage error:', storageError.message);
  } else {
    console.log('Files in project-files bucket:', storageFiles?.length || 0);
    storageFiles?.forEach(file => {
      console.log('  -', file.name);
    });
  }
  
  // Check if there's a different storage pattern
  const testProjectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2'; // Test RT2
  console.log('\nChecking storage for Test RT2 project...');
  
  const { data: testFiles, error: testError } = await supabase.storage
    .from('project-files')
    .list(testProjectId, {
      limit: 20,
      offset: 0
    });
  
  if (testFiles && testFiles.length > 0) {
    console.log('Files found for Test RT2:', testFiles.length);
    testFiles.forEach(file => {
      console.log('  -', file.name);
    });
  } else {
    console.log('No files found for Test RT2 in storage');
  }
}

debugFiles();