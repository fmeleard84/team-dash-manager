import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const projectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2' // Test RT2
    
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'project-files')
    
    if (!bucketExists) {
      console.log('Creating project-files bucket...')
      await supabase.storage.createBucket('project-files', {
        public: true,
        fileSizeLimit: 52428800
      })
    }
    
    // Upload a test file
    const testContent = 'This is a test file for Test RT2 project - uploaded via edge function'
    const fileName = `${projectId}/test-document.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, new Blob([testContent]), {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) {
      console.log('Upload error:', uploadError)
    } else {
      console.log('File uploaded:', uploadData)
    }
    
    // Insert into project_files table
    const { data: fileRecord, error: insertError } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_name: 'test-document.pdf',
        file_path: fileName,
        file_size: testContent.length,
        file_type: 'application/pdf',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.log('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // List all files for the project
    const { data: allFiles } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        fileAdded: fileRecord,
        totalFiles: allFiles?.length || 0,
        allFiles: allFiles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})