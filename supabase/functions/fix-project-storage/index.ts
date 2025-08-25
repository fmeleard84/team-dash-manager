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

    const { projectId } = await req.json();
    console.log(`[fix-project-storage] Fixing storage for project: ${projectId}`);

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const basePath = `project/${projectId}`;
    
    // 1. List all current files/folders
    const { data: currentFiles, error: listError } = await supabase.storage
      .from('project-files')
      .list(basePath, { limit: 1000 });

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    const results = {
      cleaned: [],
      created: [],
      errors: []
    };

    // 2. Clean up unwanted structures
    if (currentFiles) {
      for (const item of currentFiles) {
        // Remove any "project" subdirectory
        if (item.name === 'project' && !item.id) {
          try {
            // List files in the nested project folder
            const nestedPath = `${basePath}/project`;
            const { data: nestedFiles } = await supabase.storage
              .from('project-files')
              .list(nestedPath, { limit: 1000 });

            if (nestedFiles && nestedFiles.length > 0) {
              // Delete all files in the nested folder
              const filesToDelete = nestedFiles.map(f => `${nestedPath}/${f.name}`);
              await supabase.storage
                .from('project-files')
                .remove(filesToDelete);
              results.cleaned.push(`Removed nested project folder with ${filesToDelete.length} files`);
            }
          } catch (err) {
            console.error('Error cleaning nested project folder:', err);
            results.errors.push(`Failed to clean nested project folder: ${err.message}`);
          }
        }

        // Remove any folder with the project ID as name
        if (item.name === projectId && !item.id) {
          try {
            const idPath = `${basePath}/${projectId}`;
            const { data: idFiles } = await supabase.storage
              .from('project-files')
              .list(idPath, { limit: 1000 });

            if (idFiles && idFiles.length > 0) {
              const filesToDelete = idFiles.map(f => `${idPath}/${f.name}`);
              await supabase.storage
                .from('project-files')
                .remove(filesToDelete);
              results.cleaned.push(`Removed ID folder with ${filesToDelete.length} files`);
            }
          } catch (err) {
            console.error('Error cleaning ID folder:', err);
            results.errors.push(`Failed to clean ID folder: ${err.message}`);
          }
        }
      }
    }

    // 3. Get project details to determine resource categories
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error getting project:', projectError);
    }

    // 4. Get resource categories from assignments
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        hr_profiles!inner(
          hr_categories(name)
        )
      `)
      .eq('project_id', projectId)
      .eq('booking_status', 'accepted');

    let resourceCategories = [];
    if (!assignError && assignments) {
      resourceCategories = [...new Set(assignments
        .map(a => a.hr_profiles?.hr_categories?.name)
        .filter(Boolean)
      )];
    }

    console.log('Resource categories found:', resourceCategories);

    // 5. Create the correct folder structure
    const requiredFolders = ['Kanban', 'Messagerie'];
    
    // Add category folders
    for (const category of resourceCategories) {
      if (category && !requiredFolders.includes(category)) {
        requiredFolders.push(category);
      }
    }

    // Create placeholders for required folders
    for (const folderName of requiredFolders) {
      const folderPath = `${basePath}/${folderName}/.keep`;
      
      try {
        // Check if folder already exists
        const { data: existing } = await supabase.storage
          .from('project-files')
          .list(`${basePath}/${folderName}`, { limit: 1 });

        if (!existing || existing.length === 0) {
          // Create placeholder
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError && !uploadError.message.includes('already exists')) {
            throw uploadError;
          }
          
          results.created.push(folderName);
        }
      } catch (err) {
        console.error(`Error creating folder ${folderName}:`, err);
        results.errors.push(`Failed to create ${folderName}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Project storage structure fixed',
        projectTitle: project?.title,
        results: results,
        folders: requiredFolders
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[fix-project-storage] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});