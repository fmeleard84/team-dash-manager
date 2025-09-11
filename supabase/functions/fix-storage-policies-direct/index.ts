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

    // Test upload capability directly
    const testFileName = `test-${Date.now()}.txt`;
    const testPath = `projects/test/${testFileName}`;
    
    // Try to upload a test file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(testPath, new Blob(['test']), {
        upsert: true,
        contentType: 'text/plain'
      });

    if (uploadError) {
      console.error('Upload test failed:', uploadError);
      
      // The bucket might not have the right configuration
      // Let's check if the bucket exists and is public
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
      
      if (!projectFilesBucket) {
        // Create the bucket if it doesn't exist
        const { data: newBucket, error: createBucketError } = await supabase.storage.createBucket('project-files', {
          public: false,
          allowedMimeTypes: undefined,
          fileSizeLimit: 52428800 // 50MB
        });

        if (createBucketError) {
          return new Response(
            JSON.stringify({ 
              error: 'Cannot create bucket',
              details: createBucketError.message
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Bucket created successfully',
            action: 'Please configure RLS policies in Supabase Dashboard'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      // Bucket exists but upload failed - likely RLS issue
      return new Response(
        JSON.stringify({ 
          error: 'Bucket exists but RLS policies are blocking uploads',
          solution: 'Please update RLS policies manually in Supabase Dashboard',
          steps: [
            '1. Go to Storage in Supabase Dashboard',
            '2. Click on project-files bucket',
            '3. Go to Policies tab',
            '4. Add a policy for INSERT with: bucket_id = \'project-files\' for authenticated users',
            '5. Add a policy for SELECT with: bucket_id = \'project-files\' for authenticated users',
            '6. Add a policy for UPDATE with: bucket_id = \'project-files\' for authenticated users',
            '7. Add a policy for DELETE with: bucket_id = \'project-files\' for authenticated users'
          ]
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Upload succeeded, clean up test file
    const { error: deleteError } = await supabase.storage
      .from('project-files')
      .remove([testPath]);

    if (deleteError) {
      console.log('Could not delete test file:', deleteError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Storage is working correctly!',
        test: 'Upload and delete operations successful'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in fix-storage-policies-direct:', error);
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