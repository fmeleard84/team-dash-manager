import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pas d'imports externes pour éviter les problèmes de déploiement
// On utilise des méthodes d'extraction basiques

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📄 === EXTRACTION DE CONTENU DE FICHIER ===')

    const { fileId, filePath, projectId } = await req.json()

    if (!fileId && !filePath) {
      throw new Error('fileId ou filePath requis')
    }

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

    // Récupérer les informations du fichier
    let fileInfo = null
    if (fileId) {
      const { data, error } = await supabaseClient
        .from('kanban_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error) throw error
      fileInfo = data
    } else if (filePath) {
      const { data, error } = await supabaseClient
        .from('kanban_files')
        .select('*')
        .eq('file_path', filePath)
        .single()

      if (error) throw error
      fileInfo = data
    }

    if (!fileInfo) {
      throw new Error('Fichier non trouvé')
    }

    console.log('📁 Fichier trouvé:', {
      id: fileInfo.id,
      name: fileInfo.file_name,
      type: fileInfo.file_type,
      path: fileInfo.file_path,
      size: fileInfo.file_size
    })

    // Télécharger le fichier depuis le storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('kanban-files')
      .download(fileInfo.file_path)

    if (downloadError) {
      console.error('❌ Erreur téléchargement:', downloadError)
      throw downloadError
    }

    console.log('✅ Fichier téléchargé, taille:', fileData.size)

    // Extraire le contenu selon le type de fichier
    const fileExtension = fileInfo.file_name.split('.').pop()?.toLowerCase()
    let extractedContent = ''

    console.log(`🔍 Type de fichier détecté: .${fileExtension}`)

    switch (fileExtension) {
      // Fichiers texte simples
      case 'txt':
      case 'md':
      case 'markdown':
      case 'log':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'csv':
      case 'sql':
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'c':
      case 'cpp':
      case 'h':
      case 'css':
      case 'scss':
      case 'html':
      case 'htm':
        extractedContent = await extractTextContent(fileData)
        break

      // Documents PDF
      case 'pdf':
        extractedContent = await extractPDFContent(fileData)
        break

      // Documents Word
      case 'docx':
      case 'doc':
        extractedContent = await extractWordContent(fileData)
        break

      // Fichiers Excel
      case 'xlsx':
      case 'xls':
        extractedContent = await extractExcelContent(fileData)
        break

      // Images (description basique pour l'instant)
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
      case 'svg':
        extractedContent = await extractImageDescription(fileInfo)
        break

      default:
        console.warn(`⚠️ Type de fichier non supporté: .${fileExtension}`)
        extractedContent = `Fichier ${fileInfo.file_name} de type ${fileExtension} (contenu non extractible)`
    }

    console.log(`📝 Contenu extrait: ${extractedContent.length} caractères`)

    // Si on a un projectId, ajouter le contenu à la queue d'embeddings
    if (projectId && extractedContent) {
      console.log('🔄 Ajout à la queue d\'embeddings...')

      // Extraire le projectId du chemin si nécessaire
      let actualProjectId = projectId
      if (fileInfo.file_path.includes('projects/')) {
        const pathMatch = fileInfo.file_path.match(/projects\/([a-f0-9-]+)/)
        if (pathMatch) {
          actualProjectId = pathMatch[1]
        }
      }

      const { error: queueError } = await supabaseClient
        .from('project_embedding_queue')
        .insert({
          project_id: actualProjectId,
          source_table: 'kanban_files',
          source_id: fileInfo.id,
          content: extractedContent,
          content_type: 'document',
          metadata: {
            filename: fileInfo.file_name,
            file_type: fileInfo.file_type,
            file_size: fileInfo.file_size,
            path: fileInfo.file_path,
            extracted_at: new Date().toISOString(),
            extraction_method: fileExtension
          }
        })

      if (queueError) {
        console.error('⚠️ Erreur ajout queue (non bloquant):', queueError)
      } else {
        console.log('✅ Ajouté à la queue d\'embeddings')
      }

      // Aussi mettre à jour le fichier avec une indication qu'il a été traité
      await supabaseClient
        .from('kanban_files')
        .update({
          metadata: {
            ...fileInfo.metadata,
            content_extracted: true,
            extracted_at: new Date().toISOString(),
            content_length: extractedContent.length
          }
        })
        .eq('id', fileInfo.id)
    }

    return new Response(JSON.stringify({
      success: true,
      file: {
        id: fileInfo.id,
        name: fileInfo.file_name,
        type: fileExtension
      },
      content: {
        text: extractedContent,
        length: extractedContent.length,
        truncated: extractedContent.length > 10000 ? extractedContent.substring(0, 10000) + '...' : extractedContent
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur extraction:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Fonctions d'extraction pour chaque type de fichier

async function extractTextContent(blob: Blob): Promise<string> {
  try {
    const text = await blob.text()
    return text
  } catch (error) {
    console.error('Erreur extraction texte:', error)
    return ''
  }
}

async function extractPDFContent(blob: Blob): Promise<string> {
  try {
    // Conversion simple pour l'instant - on peut améliorer avec pdf-parse
    const buffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // Extraction basique du texte visible dans le PDF
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Nettoyer le texte extrait
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Supprimer les caractères de contrôle
    text = text.replace(/\s+/g, ' ') // Normaliser les espaces

    // Essayer d'extraire le texte entre les balises de flux PDF
    const textMatches = text.match(/\(([^)]+)\)/g)
    if (textMatches) {
      text = textMatches.map(m => m.slice(1, -1)).join(' ')
    }

    return text.substring(0, 50000) // Limiter à 50k caractères
  } catch (error) {
    console.error('Erreur extraction PDF:', error)
    return 'Contenu PDF non extractible avec la méthode simple'
  }
}

async function extractWordContent(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer()

    // Pour DOCX, on peut extraire le XML et parser le texte
    // Mammoth est idéal pour ça mais nécessite une configuration
    // Pour l'instant, extraction basique

    const uint8Array = new Uint8Array(arrayBuffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Chercher le contenu entre les balises XML de Word
    const contentMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (contentMatches) {
      text = contentMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
    } else {
      // Fallback: extraire tout texte lisible
      text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      text = text.replace(/<[^>]+>/g, ' ') // Supprimer les balises
      text = text.replace(/\s+/g, ' ')
    }

    return text.substring(0, 50000)
  } catch (error) {
    console.error('Erreur extraction Word:', error)
    return 'Contenu Word non extractible'
  }
}

async function extractExcelContent(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer()

    // Pour Excel, on extrait les valeurs des cellules
    // XLSX.js pourrait être utilisé ici
    // Pour l'instant, extraction basique des strings

    const uint8Array = new Uint8Array(arrayBuffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(uint8Array)

    // Nettoyer et extraire le texte lisible
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    text = text.replace(/<[^>]+>/g, ' ')

    // Chercher les patterns de données structurées
    const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0)
    const structured = lines.slice(0, 1000).join('\n') // Limiter aux 1000 premières lignes

    return structured
  } catch (error) {
    console.error('Erreur extraction Excel:', error)
    return 'Contenu Excel non extractible'
  }
}

async function extractImageDescription(fileInfo: any): Promise<string> {
  // Pour les images, on retourne une description basique
  // On pourrait intégrer un service d'OCR ou de vision par ordinateur ici
  const description = `Image: ${fileInfo.file_name}
Type: ${fileInfo.file_type}
Taille: ${(fileInfo.file_size / 1024).toFixed(2)} KB
Uploadé le: ${new Date(fileInfo.uploaded_at).toLocaleDateString('fr-FR')}
Chemin: ${fileInfo.file_path}

Note: L'extraction du contenu textuel des images nécessite un service OCR qui n'est pas encore configuré.`

  return description
}