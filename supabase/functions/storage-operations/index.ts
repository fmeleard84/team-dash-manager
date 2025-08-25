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

    const { operation, oldPath, newPath, isFolder } = await req.json();
    console.log(`[storage-operations] Operation: ${operation}, Path: ${oldPath}`);

    switch (operation) {
      case 'rename': {
        if (!oldPath || !newPath) {
          throw new Error('Both oldPath and newPath are required for rename operation');
        }

        // For folders, we need to move all files within the folder
        if (isFolder) {
          // List all files in the folder
          const { data: files, error: listError } = await supabase.storage
            .from('project-files')
            .list(oldPath, { limit: 1000 });

          if (listError) throw listError;

          if (files && files.length > 0) {
            // Move each file to the new path
            const movePromises = files.map(async (file) => {
              const oldFilePath = `${oldPath}/${file.name}`;
              const newFilePath = `${newPath}/${file.name}`;
              
              // Download the file
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('project-files')
                .download(oldFilePath);
              
              if (downloadError) {
                console.error(`Error downloading ${oldFilePath}:`, downloadError);
                return { success: false, path: oldFilePath, error: downloadError.message };
              }

              // Upload to new location
              const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(newFilePath, fileData, { upsert: true });
              
              if (uploadError) {
                console.error(`Error uploading ${newFilePath}:`, uploadError);
                return { success: false, path: newFilePath, error: uploadError.message };
              }

              // Delete from old location
              const { error: deleteError } = await supabase.storage
                .from('project-files')
                .remove([oldFilePath]);
              
              if (deleteError) {
                console.error(`Error deleting ${oldFilePath}:`, deleteError);
                return { success: false, path: oldFilePath, error: deleteError.message };
              }

              return { success: true, path: newFilePath };
            });

            const results = await Promise.all(movePromises);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success);

            return new Response(
              JSON.stringify({ 
                success: failed.length === 0,
                message: `Renamed folder: ${successful} files moved successfully`,
                failed: failed
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Empty folder - just create new placeholder
          const { error } = await supabase.storage
            .from('project-files')
            .upload(`${newPath}/.emptyFolderPlaceholder`, new Blob(['']));
          
          if (error) throw error;

          // Remove old placeholder
          await supabase.storage
            .from('project-files')
            .remove([`${oldPath}/.emptyFolderPlaceholder`]);

        } else {
          // Single file rename
          // Download the file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('project-files')
            .download(oldPath);
          
          if (downloadError) throw downloadError;

          // Upload with new name
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(newPath, fileData, { upsert: false });
          
          if (uploadError) throw uploadError;

          // Delete old file
          const { error: deleteError } = await supabase.storage
            .from('project-files')
            .remove([oldPath]);
          
          if (deleteError) throw deleteError;
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Successfully renamed ${isFolder ? 'folder' : 'file'}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!oldPath) {
          throw new Error('Path is required for delete operation');
        }

        if (isFolder) {
          // List all files in the folder
          const { data: files, error: listError } = await supabase.storage
            .from('project-files')
            .list(oldPath, { limit: 1000 });

          if (listError) throw listError;

          if (files && files.length > 0) {
            // Delete all files in the folder
            const filePaths = files.map(f => `${oldPath}/${f.name}`);
            const { error: deleteError } = await supabase.storage
              .from('project-files')
              .remove(filePaths);
            
            if (deleteError) throw deleteError;
          }

          // Remove folder placeholder if it exists
          await supabase.storage
            .from('project-files')
            .remove([`${oldPath}/.emptyFolderPlaceholder`]);
          
        } else {
          // Single file delete
          const { error } = await supabase.storage
            .from('project-files')
            .remove([oldPath]);
          
          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Successfully deleted ${isFolder ? 'folder' : 'file'}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('[storage-operations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});