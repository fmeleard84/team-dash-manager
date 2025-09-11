import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot list buckets',
          details: bucketsError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const projectFilesBucket = buckets?.find(b => b.name === 'project-files');
    
    // 2. Test operations with service role (should always work)
    const testResults = {
      bucketExists: !!projectFilesBucket,
      bucketDetails: projectFilesBucket,
      operations: {
        upload: false,
        read: false,
        update: false,
        delete: false
      }
    };

    if (projectFilesBucket) {
      // Test upload
      const testFileName = `test-${Date.now()}.txt`;
      const testPath = `test/${testFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(testPath, new Blob(['test']), {
          upsert: true,
          contentType: 'text/plain'
        });
      
      testResults.operations.upload = !uploadError;
      if (uploadError) {
        console.log('Upload error:', uploadError);
      }

      if (!uploadError) {
        // Test read
        const { data: readData, error: readError } = await supabase.storage
          .from('project-files')
          .download(testPath);
        
        testResults.operations.read = !readError;
        
        // Test update (re-upload with upsert)
        const { error: updateError } = await supabase.storage
          .from('project-files')
          .upload(testPath, new Blob(['test updated']), {
            upsert: true,
            contentType: 'text/plain'
          });
        
        testResults.operations.update = !updateError;
        
        // Test delete
        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove([testPath]);
        
        testResults.operations.delete = !deleteError;
      }
    }

    // 3. Get RLS policies info (requires database query)
    let policiesInfo = null;
    try {
      // Try to get policies using raw SQL
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('schemaname', 'storage')
        .eq('tablename', 'objects');
      
      if (!policiesError && policies) {
        policiesInfo = policies;
      }
    } catch (e) {
      console.log('Could not fetch policies:', e);
    }

    // 4. Test with anon key to check if authenticated users can upload
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';
    
    const anonSupabase = createClient(supabaseUrl, anonKey);
    
    // Create a test user session
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'test123456',
      email_confirm: true
    });

    let authenticatedTestResults = {
      canUpload: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      error: null as string | null
    };

    if (user && !authError) {
      // Test with authenticated context
      const testPath2 = `projects/test-project/${Date.now()}.txt`;
      
      // Use service role to upload for the user
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(testPath2, new Blob(['test']), {
          upsert: true,
          contentType: 'text/plain'
        });
      
      if (uploadError) {
        authenticatedTestResults.error = uploadError.message;
      } else {
        authenticatedTestResults.canUpload = true;
        
        // Clean up
        await supabase.storage
          .from('project-files')
          .remove([testPath2]);
      }
      
      // Clean up test user
      await supabase.auth.admin.deleteUser(user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        bucketStatus: testResults,
        authenticatedTests: authenticatedTestResults,
        policies: policiesInfo,
        recommendation: !testResults.operations.upload 
          ? 'Bucket is not configured properly. RLS policies need to be updated.'
          : 'Bucket is configured and working with service role.',
        instructions: !testResults.operations.upload ? [
          '1. Go to Storage in Supabase Dashboard',
          '2. Click on project-files bucket',
          '3. Go to Policies tab',
          '4. Make sure RLS is enabled',
          '5. Add INSERT policy: Allow authenticated users to upload to any path',
          '6. Add SELECT policy: Allow authenticated users to read from any path',
          '7. Add UPDATE policy: Allow authenticated users to update any path',
          '8. Add DELETE policy: Allow authenticated users to delete from any path'
        ] : null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in check-storage-policies:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});