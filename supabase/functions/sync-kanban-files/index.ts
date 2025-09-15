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

    console.log('🚀 Syncing files with service role:', files.length, 'files for project', projectId)
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
          status: 200, // Return 200 to not break Kanban functionality
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First try to determine the type of uploaded_by column
    let useUuid = false
    try {
      // Test insert with UUID to see if column expects UUID
      const testRef = {
        project_id: projectId,
        file_name: 'test',
        file_path: 'test',
        uploaded_by: userId
      }
      
      const { error: testError } = await supabaseAdmin
        .from('project_files')
        .insert(testRef)
        .select()
        .single()
      
      if (!testError || !testError.message?.includes('invalid input syntax for type uuid')) {
        useUuid = true
        // Clean up test record if it was created
        await supabaseAdmin
          .from('project_files')
          .delete()
          .eq('file_name', 'test')
          .eq('file_path', 'test')
      }
    } catch (e) {
      console.log('Column type detection:', e)
    }

    // Build file references with the appropriate uploaded_by value
    const fileReferences = files.map((file: any) => {
      const ref: any = {
        project_id: projectId,
        file_name: file.name,
        file_path: file.path,
        uploaded_by: useUuid ? userId : userEmail
      }
      
      // Add optional fields only if they're in the original file object
      if (file.size !== undefined) ref.file_size = file.size
      if (file.type !== undefined) ref.file_type = file.type
      
      return ref
    })

    // Physical copy of files from kanban-files to project-files bucket
    console.log('📂 Copying files from kanban-files to project-files bucket')
    
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
        // Put files in a "Kanban" subfolder within the project
        const destinationPath = `projects/${projectId}/Kanban/${file.name}`
        
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
        console.log('✅ Successfully copied:', file.name, 'to Drive')
      } catch (error) {
        console.error('❌ Error copying file:', file.name, error)
        failedFiles.push(file.name)
      }
    }
    
    // Also create the references in project_files table for tracking
    console.log('💾 Creating Drive references for', fileReferences.length, 'files')
    console.log('📋 Using', useUuid ? 'UUID' : 'Email', 'for uploaded_by field')
    
    const { data, error } = await supabaseAdmin
      .from('project_files')
      .insert(fileReferences)
      .select()

    if (error) {
      console.error('❌ Failed to create database references:', error)
      // Don't fail the whole operation if DB insert fails
    }

    console.log('✅ Files copied to Drive:', copiedFiles.length, '/', files.length)
    if (failedFiles.length > 0) {
      console.log('⚠️ Failed to copy:', failedFiles.join(', '))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Files synced to Drive successfully (${copiedFiles.length}/${files.length} copied)`,
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
    console.error('❌ Error in sync-kanban-files function:', error)
    
    // Return success for Kanban even if Drive sync completely fails
    return new Response(
      JSON.stringify({ 
        warning: 'Files uploaded but Drive sync encountered an error',
        files_uploaded: true,
        error: error.message || 'Unknown error'
      }),
      { 
        status: 200, // Return 200 to not break Kanban functionality
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})