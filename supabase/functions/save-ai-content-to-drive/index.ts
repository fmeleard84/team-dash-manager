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
    const { projectId, fileName, content, contentType, aiMemberName } = await req.json()

    console.log('💾 Sauvegarde contenu IA:', {
      projectId,
      fileName,
      contentType,
      aiMemberName,
      contentLength: content?.length || 0
    })

    if (!projectId || !fileName || !content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Paramètres manquants: projectId, fileName, content requis'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Créer le chemin de fichier dans le Drive
    const driveFilePath = `projects/${projectId}/IA/${fileName}`

    console.log('📂 Chemin Drive:', driveFilePath)

    // 2. Uploader le fichier dans le storage Supabase
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('kanban-files')
      .upload(driveFilePath, content, {
        contentType: 'text/markdown',
        upsert: true // Remplacer si existe déjà
      })

    if (uploadError) {
      console.error('❌ Erreur upload storage:', uploadError)
      throw new Error(`Erreur upload: ${uploadError.message}`)
    }

    console.log('✅ Fichier uploadé dans storage:', uploadData.path)

    // 3. Obtenir l'URL publique du fichier
    const { data: urlData } = supabaseClient.storage
      .from('kanban-files')
      .getPublicUrl(driveFilePath)

    // 4. Créer l'entrée dans la table kanban_files pour l'intégration Drive
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    const userId = user?.id || 'ai-system'

    const driveEntry = {
      project_id: projectId,
      file_name: fileName,
      file_path: driveFilePath,
      file_type: 'text/markdown',
      file_size: new Blob([content]).size,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      folder_path: `projects/${projectId}/IA`,
      is_ai_generated: true, // Marqueur spécial pour les contenus IA
      ai_member_name: aiMemberName,
      content_type: contentType
    }

    const { data: fileRecord, error: recordError } = await supabaseClient
      .from('kanban_files')
      .insert(driveEntry)
      .select()
      .single()

    if (recordError) {
      console.error('❌ Erreur création enregistrement:', recordError)
      // Ne pas échouer complètement, le fichier est déjà sauvé
      console.warn('⚠️ Fichier sauvé mais sans enregistrement Drive')
    } else {
      console.log('✅ Enregistrement Drive créé:', fileRecord.id)
    }

    // 5. Créer un dossier IA s'il n'existe pas déjà
    try {
      const folderPath = `projects/${projectId}/IA`
      const { error: folderError } = await supabaseClient
        .from('drive_folders')
        .upsert({
          project_id: projectId,
          folder_name: 'IA',
          folder_path: folderPath,
          parent_folder: `projects/${projectId}`,
          created_by: userId,
          is_ai_folder: true
        }, {
          onConflict: 'folder_path'
        })

      if (folderError) {
        console.warn('⚠️ Erreur création dossier IA (non bloquant):', folderError)
      } else {
        console.log('✅ Dossier IA vérifié/créé')
      }
    } catch (folderError) {
      console.warn('⚠️ Gestion dossier IA échouée (non bloquant):', folderError)
    }

    const result = {
      success: true,
      message: 'Contenu IA sauvegardé avec succès',
      data: {
        fileName: fileName,
        filePath: driveFilePath,
        fileUrl: urlData.publicUrl,
        fileSize: new Blob([content]).size,
        contentType: contentType,
        aiMemberName: aiMemberName,
        fileId: fileRecord?.id,
        driveIntegrated: !!fileRecord
      }
    }

    console.log('🎉 Sauvegarde terminée:', result.data.fileName)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur sauvegarde IA:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})