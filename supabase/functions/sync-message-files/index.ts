import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { files, projectId, userId, userEmail } = await req.json()

    if (!files || !projectId || (!userId && !userEmail)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: files, projectId, userId or userEmail' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🚀 Syncing message files with service role:', files.length, 'files for project', projectId)
    console.log('👤 User:', userId ? `UUID: ${userId}` : `Email: ${userEmail}`)

    // First, check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('project_files')
      .select('*')
      .limit(0)

    if (tableError) {
      console.error('❌ Table access error:', tableError)
      // If table doesn't exist or we can't access it, skip sync
      return new Response(
        JSON.stringify({ 
          warning: 'Drive sync skipped - table access issue',
          files_uploaded: true,
          details: tableError.message 
        }), 
        { 
          status: 200, // Return 200 to not break Message functionality
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Physical copy of files from kanban-files to project-files bucket
    console.log('📂 Copying message files from kanban-files to project-files bucket')
    
    const copiedFiles: string[] = []
    const failedFiles: string[] = []
    
    for (const file of files) {
      try {
        // Download file from kanban-files bucket
        const { data: fileData, error: downloadError } = await supabaseAdmin
          .storage
          .from('kanban-files')
          .download(file.path)
        
        if (downloadError || !fileData) {
          console.error('❌ Failed to download file:', file.path, downloadError)
          failedFiles.push(file.name)
          continue
        }
        
        // Create destination path in project-files bucket
        // Put files in a "Messagerie" subfolder within the project
        const destinationPath = `project/${projectId}/Messagerie/${file.name}`
        
        console.log('📤 Uploading to project-files:', destinationPath)
        
        // Upload to project-files bucket
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('project-files')
          .upload(destinationPath, fileData, {
            contentType: file.type,
            upsert: true // Overwrite if exists
          })
        
        if (uploadError) {
          console.error('❌ Failed to upload to project-files:', destinationPath, uploadError)
          failedFiles.push(file.name)
          continue
        }
        
        copiedFiles.push(file.name)
        console.log('✅ Successfully copied:', file.name, 'to Drive Messagerie folder')
      } catch (error) {
        console.error('❌ Error copying file:', file.name, error)
        failedFiles.push(file.name)
      }
    }
    
    console.log('✅ Message files copied to Drive:', copiedFiles.length, '/', files.length)
    if (failedFiles.length > 0) {
      console.log('⚠️ Failed to copy:', failedFiles.join(', '))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Message files synced to Drive successfully (${copiedFiles.length}/${files.length} copied)`,
        copiedFiles: copiedFiles,
        failedFiles: failedFiles,
        fileCount: copiedFiles.length,
        totalFiles: files.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in sync-message-files function:', error)
    
    // Return success for Messages even if Drive sync completely fails
    return new Response(
      JSON.stringify({ 
        warning: 'Message files uploaded but Drive sync encountered an error',
        files_uploaded: true,
        error: error.message || 'Unknown error'
      }),
      { 
        status: 200, // Return 200 to not break Message functionality
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})