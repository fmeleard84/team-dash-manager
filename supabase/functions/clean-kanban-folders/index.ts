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

    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: projectId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🧹 Cleaning Kanban folders for project:', projectId)

    // List all items in the Kanban folder
    const kanbanPath = `projects/${projectId}/Kanban/`
    const { data: items, error: listError } = await supabaseAdmin
      .storage
      .from('project-files')
      .list(kanbanPath, { limit: 1000 })

    if (listError) {
      console.error('❌ Error listing Kanban folder:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to list Kanban folder', details: listError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📁 Found ${items?.length || 0} items in Kanban folder`)

    // Identify empty directories (folders that don't have actual files)
    const foldersToDelete: string[] = []
    const validFiles: string[] = []

    if (items && items.length > 0) {
      for (const item of items) {
        // Check if it's a folder (no extension) or a temp folder
        if (!item.name.includes('.') || item.name.startsWith('temp-')) {
          // Check if this folder has any contents
          const folderPath = `${kanbanPath}${item.name}/`
          const { data: folderContents } = await supabaseAdmin
            .storage
            .from('project-files')
            .list(folderPath, { limit: 10 })

          if (!folderContents || folderContents.length === 0) {
            // Empty folder, mark for deletion
            foldersToDelete.push(item.name)
            console.log(`🗑️ Empty folder to delete: ${item.name}`)
          }
        } else {
          // It's a file
          validFiles.push(item.name)
        }
      }
    }

    // Delete empty folders
    let deletedCount = 0
    for (const folderName of foldersToDelete) {
      try {
        // Try to delete the .keep file if it exists
        const keepFilePath = `${kanbanPath}${folderName}/.keep`
        await supabaseAdmin
          .storage
          .from('project-files')
          .remove([keepFilePath])

        deletedCount++
        console.log(`✅ Deleted empty folder: ${folderName}`)
      } catch (error) {
        console.error(`⚠️ Could not delete folder ${folderName}:`, error)
      }
    }

    console.log(`🎯 Cleanup complete: ${deletedCount} empty folders deleted, ${validFiles.length} files preserved`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${deletedCount} empty folders`,
        deletedFolders: foldersToDelete,
        preservedFiles: validFiles,
        stats: {
          totalItems: items?.length || 0,
          deletedFolders: deletedCount,
          preservedFiles: validFiles.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ Error in clean-kanban-folders function:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})