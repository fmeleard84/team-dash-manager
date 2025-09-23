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
    console.log('🚀 === TRAITEMENT UPLOAD FICHIER ===')

    const { record } = await req.json()

    if (!record || !record.id) {
      throw new Error('Enregistrement invalide')
    }

    console.log('📄 Nouveau fichier uploadé:', {
      id: record.id,
      name: record.file_name,
      path: record.file_path,
      type: record.file_type
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Extraire le projectId du chemin
    let projectId = null
    if (record.file_path && record.file_path.includes('projects/')) {
      const pathMatch = record.file_path.match(/projects\/([a-f0-9-]+)/)
      if (pathMatch) {
        projectId = pathMatch[1]
        console.log('✅ Project ID extrait:', projectId)
      }
    }

    if (!projectId) {
      console.log('⚠️ Pas de project ID trouvé dans le chemin')
      return new Response(JSON.stringify({
        success: false,
        message: 'Fichier non lié à un projet'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Déterminer si le fichier est extractible
    const fileExtension = record.file_name.split('.').pop()?.toLowerCase()
    const extractibleExtensions = [
      'txt', 'md', 'markdown', 'log', 'json', 'xml', 'yaml', 'yml',
      'csv', 'sql', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp',
      'h', 'css', 'scss', 'html', 'htm', 'pdf', 'docx', 'doc', 'xlsx', 'xls'
    ]

    const isExtractible = extractibleExtensions.includes(fileExtension || '')

    if (!isExtractible) {
      console.log(`⚠️ Fichier non extractible: .${fileExtension}`)

      // Ajouter quand même à la queue avec métadonnées seulement
      await supabaseClient
        .from('project_embedding_queue')
        .insert({
          project_id: projectId,
          source_table: 'kanban_files',
          source_id: record.id,
          content: `Fichier ${record.file_name} de type ${fileExtension}`,
          content_type: 'document',
          metadata: {
            filename: record.file_name,
            file_type: record.file_type,
            file_size: record.file_size,
            path: record.file_path,
            extractible: false
          }
        })

      return new Response(JSON.stringify({
        success: true,
        message: 'Fichier non extractible, métadonnées ajoutées'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`✅ Fichier extractible détecté: .${fileExtension}`)

    // Télécharger et extraire le contenu
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('kanban-files')
      .download(record.file_path)

    if (downloadError) {
      console.error('❌ Erreur téléchargement:', downloadError)
      throw downloadError
    }

    console.log('✅ Fichier téléchargé, taille:', fileData.size)

    // Extraire le contenu selon le type
    let extractedContent = ''

    try {
      if (['txt', 'md', 'markdown', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'sql',
           'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'scss',
           'html', 'htm'].includes(fileExtension || '')) {
        // Fichiers texte
        extractedContent = await fileData.text()
      } else if (fileExtension === 'pdf') {
        // PDF - extraction basique
        extractedContent = await extractPDFBasic(fileData)
      } else if (['docx', 'doc'].includes(fileExtension || '')) {
        // Word - extraction basique
        extractedContent = await extractWordBasic(fileData)
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        // Excel - extraction basique
        extractedContent = await extractExcelBasic(fileData)
      }

      // Limiter la taille du contenu
      if (extractedContent.length > 100000) {
        extractedContent = extractedContent.substring(0, 100000) + '\n\n[... Contenu tronqué à 100k caractères ...]'
      }

      console.log(`📝 Contenu extrait: ${extractedContent.length} caractères`)

    } catch (extractError) {
      console.error('⚠️ Erreur extraction:', extractError)
      extractedContent = `Erreur lors de l'extraction du contenu de ${record.file_name}`
    }

    // Ajouter à la queue d'embeddings avec le contenu extrait
    const { error: queueError } = await supabaseClient
      .from('project_embedding_queue')
      .insert({
        project_id: projectId,
        source_table: 'kanban_files',
        source_id: record.id,
        content: extractedContent || `Fichier ${record.file_name}`,
        content_type: 'document',
        metadata: {
          filename: record.file_name,
          file_type: record.file_type,
          file_size: record.file_size,
          path: record.file_path,
          extracted_at: new Date().toISOString(),
          extraction_method: fileExtension,
          content_length: extractedContent.length
        }
      })

    if (queueError) {
      console.error('❌ Erreur ajout queue:', queueError)
      throw queueError
    }

    console.log('✅ Ajouté à la queue d\'embeddings')

    // Mettre à jour le fichier avec l'indication d'extraction
    await supabaseClient
      .from('kanban_files')
      .update({
        metadata: {
          ...record.metadata,
          content_extracted: true,
          extracted_at: new Date().toISOString(),
          content_length: extractedContent.length
        }
      })
      .eq('id', record.id)

    // Optionnel: Déclencher immédiatement le traitement de l'embedding
    // pour ce fichier spécifique (au lieu d'attendre le CRON)
    if (extractedContent.length > 0) {
      try {
        const { data } = await supabaseClient.functions.invoke('process-project-embeddings', {
          body: { action: 'process', batchSize: 1 }
        })
        console.log('🔄 Traitement embedding déclenché:', data)
      } catch (embedError) {
        console.warn('⚠️ Impossible de déclencher le traitement immédiat:', embedError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Fichier traité avec succès',
      data: {
        fileId: record.id,
        fileName: record.file_name,
        contentLength: extractedContent.length,
        projectId: projectId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur traitement:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Fonctions d'extraction simplifiées

async function extractPDFBasic(blob: Blob): Promise<string> {
  try {
    const buffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Nettoyer le texte
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')

    // Extraire le texte entre parenthèses (contenu PDF)
    const matches = text.match(/\(([^)]+)\)/g)
    if (matches) {
      text = matches
        .map(m => m.slice(1, -1))
        .filter(m => m.length > 2)
        .join(' ')
    }

    // Nettoyer les espaces multiples
    text = text.replace(/\s+/g, ' ').trim()

    return text || 'Contenu PDF non extractible avec la méthode basique'
  } catch (error) {
    console.error('Erreur extraction PDF:', error)
    return 'Erreur extraction PDF'
  }
}

async function extractWordBasic(blob: Blob): Promise<string> {
  try {
    const buffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Nettoyer et extraire le texte des balises XML Word
    const contentMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (contentMatches) {
      text = contentMatches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .join(' ')
    } else {
      // Fallback: extraire tout texte lisible
      text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      text = text.replace(/<[^>]+>/g, ' ')
    }

    text = text.replace(/\s+/g, ' ').trim()

    return text || 'Contenu Word non extractible avec la méthode basique'
  } catch (error) {
    console.error('Erreur extraction Word:', error)
    return 'Erreur extraction Word'
  }
}

async function extractExcelBasic(blob: Blob): Promise<string> {
  try {
    const buffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Nettoyer le texte
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '\n')

    // Extraire les strings lisibles (au moins 3 caractères)
    const matches = text.match(/[a-zA-Z0-9À-ÿ\s,;.\-_]{3,}/g)
    if (matches) {
      text = matches
        .filter(m => m.trim().length > 2)
        .join('\n')
    }

    return text || 'Contenu Excel non extractible avec la méthode basique'
  } catch (error) {
    console.error('Erreur extraction Excel:', error)
    return 'Erreur extraction Excel'
  }
}