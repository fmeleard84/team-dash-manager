import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testUpload() {
  const projectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2'; // Test RT2
  
  // Create a test file
  const testContent = 'This is a test file for Test RT2 project';
  const blob = new Blob([testContent], { type: 'text/plain' });
  const testFile = new File([blob], 'test-file.txt', { type: 'text/plain' });
  
  console.log('Uploading test file to project Test RT2...');
  
  // Try uploading to project-files bucket
  const fileName = `${projectId}/${Date.now()}_test-file.txt`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(fileName, testFile);
  
  if (uploadError) {
    console.log('Upload error:', uploadError.message);
    
    // Try creating the bucket if it doesn't exist
    console.log('Trying to create project-files bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage
      .createBucket('project-files', {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.log('Bucket creation error:', bucketError.message);
    } else {
      console.log('Bucket created or already exists, retrying upload...');
      
      // Retry upload
      const { data: retryData, error: retryError } = await supabase.storage
        .from('project-files')
        .upload(fileName, testFile);
      
      if (retryError) {
        console.log('Retry upload error:', retryError.message);
      } else {
        console.log('File uploaded successfully:', retryData);
      }
    }
  } else {
    console.log('File uploaded successfully:', uploadData);
  }
  
  // Now insert into project_files table
  console.log('\nInserting into project_files table...');
  const { data: fileRecord, error: insertError } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      file_name: 'test-file.txt',
      file_path: fileName,
      file_size: testFile.size,
      file_type: 'text/plain',
      uploaded_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (insertError) {
    console.log('Insert error:', insertError.message);
    console.log('Full error:', insertError);
  } else {
    console.log('File record inserted:', fileRecord);
  }
  
  // Verify the file exists
  console.log('\nVerifying file...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId);
  
  console.log('Files for Test RT2:', verifyData?.length || 0);
  if (verifyData) {
    verifyData.forEach(file => {
      console.log('  -', file.file_name, '(ID:', file.id, ')');
    });
  }
}

testUpload();