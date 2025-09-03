import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // 1. Récupérer tous les fichiers avec l'ancien format
    const { data: oldFiles, error: fetchError } = await supabase
      .from('storage.objects')
      .select('id, name, bucket_id, created_at')
      .eq('bucket_id', 'project-files')
      .like('name', 'project/%');

    if (fetchError) {
      throw new Error(`Failed to fetch files: ${fetchError.message}`);
    }

    console.log(`Found ${oldFiles?.length || 0} files with old path format`);

    if (!oldFiles || oldFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No files to migrate. All files already use the correct format.',
          migratedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Préparer les mises à jour
    const updates = [];
    const sampleFiles = [];
    
    for (const file of oldFiles) {
      const newName = file.name.replace(/^project\//, 'projects/');
      
      // Garder un échantillon pour le rapport
      if (sampleFiles.length < 10) {
        sampleFiles.push({
          old: file.name,
          new: newName
        });
      }
      
      updates.push({
        id: file.id,
        oldName: file.name,
        newName: newName
      });
    }

    // 3. Effectuer les mises à jour
    let successCount = 0;
    const errors = [];
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('storage.objects')
        .update({ name: update.newName })
        .eq('id', update.id);
      
      if (updateError) {
        errors.push({
          file: update.oldName,
          error: updateError.message
        });
        console.error(`Failed to update ${update.oldName}:`, updateError);
      } else {
        successCount++;
      }
    }

    // 4. Vérifier s'il reste des fichiers avec l'ancien format
    const { data: remainingOldFiles } = await supabase
      .from('storage.objects')
      .select('id')
      .eq('bucket_id', 'project-files')
      .like('name', 'project/%');

    // 5. Compter les fichiers avec le nouveau format
    const { data: newFormatFiles } = await supabase
      .from('storage.objects')
      .select('id')
      .eq('bucket_id', 'project-files')
      .like('name', 'projects/%');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed. ${successCount} files migrated successfully.`,
        stats: {
          filesProcessed: oldFiles.length,
          successfullyMigrated: successCount,
          failed: errors.length,
          remainingOldFormat: remainingOldFiles?.length || 0,
          totalNewFormat: newFormatFiles?.length || 0
        },
        sampleMigrations: sampleFiles,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in migrate-storage-paths:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hint: 'You may need to run the migration SQL script manually in Supabase dashboard'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});