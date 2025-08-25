import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { projectId, projectTitle, resourceCategories } = await req.json();
    console.log(`[init-project-storage] Initializing storage for project: ${projectId}`);

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Create the base project folder structure
    const basePath = `project/${projectId}`;
    
    // Create placeholder files for each folder to ensure they exist
    const folders = [
      `${basePath}/.emptyFolderPlaceholder`, // Root project folder
      `${basePath}/Kanban/.emptyFolderPlaceholder`, // Kanban uploads
      `${basePath}/Messagerie/.emptyFolderPlaceholder`, // Messaging uploads
    ];

    // Add category folders if provided
    if (resourceCategories && Array.isArray(resourceCategories)) {
      for (const category of resourceCategories) {
        if (category) {
          const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
          folders.push(`${basePath}/${categoryName}/.emptyFolderPlaceholder`);
        }
      }
    }

    // Create all folders by uploading placeholder files
    const results = [];
    for (const folderPath of folders) {
      try {
        // Check if placeholder already exists
        const { data: existing } = await supabase.storage
          .from('project-files')
          .list(folderPath.substring(0, folderPath.lastIndexOf('/')), {
            limit: 1,
            search: '.emptyFolderPlaceholder'
          });

        if (!existing || existing.length === 0) {
          // Upload empty placeholder to create the folder
          const { data, error } = await supabase.storage
            .from('project-files')
            .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
              cacheControl: '3600',
              upsert: true
            });

          if (error) {
            console.error(`Error creating folder ${folderPath}:`, error);
            results.push({ path: folderPath, success: false, error: error.message });
          } else {
            console.log(`Created folder: ${folderPath}`);
            results.push({ path: folderPath, success: true });
          }
        } else {
          console.log(`Folder already exists: ${folderPath}`);
          results.push({ path: folderPath, success: true, existed: true });
        }
      } catch (err) {
        console.error(`Unexpected error for ${folderPath}:`, err);
        results.push({ path: folderPath, success: false, error: err.message });
      }
    }

    // Clean up any unwanted files (like the PDF you mentioned)
    try {
      const { data: files } = await supabase.storage
        .from('project-files')
        .list(basePath, { limit: 100 });

      if (files) {
        for (const file of files) {
          // Remove any PDF files that shouldn't be there by default
          if (file.name.endsWith('.pdf') && file.name.includes('250428_SMF')) {
            const { error } = await supabase.storage
              .from('project-files')
              .remove([`${basePath}/${file.name}`]);
            
            if (!error) {
              console.log(`Removed unexpected file: ${file.name}`);
            }
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Project storage initialized',
        folders: results.filter(r => r.success).map(r => r.path.replace('/.emptyFolderPlaceholder', ''))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[init-project-storage] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});