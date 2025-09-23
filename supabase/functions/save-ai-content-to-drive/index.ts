import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction simplifiée pour convertir le markdown en HTML
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Titres
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Gras et italique
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

  // Listes
  html = html.replace(/^\* (.+)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraphes
  html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');

  return html;
}

// Fonction pour créer un document Word simple
function createSimpleDocx(content: string, title: string, author: string): string {
  const html = markdownToHtml(content);

  // Template Word simple en HTML
  const wordDocument = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Calibri, sans-serif; line-height: 1.6; color: #333; }
        h1 { color: #2c3e50; font-size: 24pt; margin-bottom: 20pt; }
        h2 { color: #34495e; font-size: 18pt; margin-top: 20pt; margin-bottom: 10pt; }
        h3 { color: #34495e; font-size: 14pt; margin-top: 15pt; margin-bottom: 10pt; }
        p { font-size: 11pt; margin-bottom: 10pt; }
        li { font-size: 11pt; margin-bottom: 5pt; }
        .author { font-style: italic; color: #7f8c8d; margin-bottom: 20pt; }
        .footer { margin-top: 40pt; padding-top: 20pt; border-top: 1pt solid #bdc3c7; font-size: 10pt; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="author">Généré par ${author}</p>
      ${html}
      <div class="footer">
        <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p>© Vaya Platform - IA Assistant</p>
      </div>
    </body>
    </html>
  `;

  return wordDocument;
}

// Fonction pour créer un PDF simple (HTML vers PDF concept)
function createSimplePdf(content: string, title: string, author: string): string {
  const html = markdownToHtml(content);

  const pdfDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 12pt; }
        h1 { color: #2c3e50; font-size: 20pt; margin-bottom: 15pt; page-break-after: avoid; }
        h2 { color: #34495e; font-size: 16pt; margin-top: 15pt; margin-bottom: 8pt; page-break-after: avoid; }
        h3 { color: #34495e; font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid; }
        p { font-size: 12pt; margin-bottom: 8pt; }
        li { font-size: 12pt; margin-bottom: 4pt; }
        .header { text-align: center; border-bottom: 2pt solid #2c3e50; padding-bottom: 10pt; margin-bottom: 20pt; }
        .author { font-style: italic; color: #7f8c8d; margin-bottom: 20pt; }
        .footer { margin-top: 30pt; padding-top: 15pt; border-top: 1pt solid #bdc3c7; font-size: 10pt; color: #7f8c8d; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p class="author">Généré par ${author}</p>
      </div>
      ${html}
      <div class="footer">
        <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p>© Vaya Platform - IA Assistant</p>
      </div>
    </body>
    </html>
  `;

  return pdfDocument;
}

// Fonction pour créer un fichier CSV/Excel simple
function createSimpleExcel(content: string, title: string, author: string): string {
  // Extraire des données structurées du markdown pour créer un tableau
  let csvContent = `"Titre","${title}"\n"Auteur","${author}"\n"Date","${new Date().toLocaleDateString('fr-FR')}"\n\n`;

  // Essayer d'extraire des listes ou données structurées
  const lines = content.split('\n').filter(line => line.trim());

  csvContent += '"Section","Contenu"\n';

  let currentSection = 'Général';
  for (const line of lines) {
    if (line.startsWith('#')) {
      currentSection = line.replace(/^#+\s*/, '').replace(/"/g, '""');
    } else if (line.trim() && !line.startsWith('*') && !line.startsWith('-')) {
      const cleanLine = line.trim().replace(/"/g, '""');
      csvContent += `"${currentSection}","${cleanLine}"\n`;
    } else if (line.startsWith('*') || line.startsWith('-')) {
      const cleanLine = line.replace(/^[\*\-]\s*/, '').trim().replace(/"/g, '""');
      csvContent += `"${currentSection} - Item","${cleanLine}"\n`;
    }
  }

  return csvContent;
}

// Fonction pour déterminer le type de fichier basé sur le nom et le contenu
function determineFileType(fileName: string, aiMemberName: string, content: string): {
  type: 'docx' | 'pdf' | 'csv' | 'xlsx',
  mimeType: string,
  generator: (content: string, title: string, author: string) => string
} {
  const extension = fileName.toLowerCase().split('.').pop();

  // Détection basée sur l'extension
  if (extension === 'pdf') {
    return {
      type: 'pdf',
      mimeType: 'application/pdf',
      generator: createSimplePdf
    };
  }

  if (extension === 'csv' || extension === 'xlsx') {
    return {
      type: 'csv',
      mimeType: 'text/csv',
      generator: createSimpleExcel
    };
  }

  // Détection basée sur le nom de l'IA
  if (aiMemberName?.toLowerCase().includes('analyste') || aiMemberName?.toLowerCase().includes('data')) {
    if (content.includes('tableau') || content.includes('données') || content.includes('statistique')) {
      return {
        type: 'csv',
        mimeType: 'text/csv',
        generator: createSimpleExcel
      };
    }
  }

  // Détection basée sur le contenu
  if (content.includes('tableau') || content.includes('data') || content.includes('calcul')) {
    return {
      type: 'csv',
      mimeType: 'text/csv',
      generator: createSimpleExcel
    };
  }

  // Par défaut : Word document
  return {
    type: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    generator: createSimpleDocx
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId, fileName, content, contentType, aiMemberName, title, generateDocx } = await req.json()

    console.log('💾 Sauvegarde contenu IA:', {
      projectId,
      fileName,
      contentType,
      aiMemberName,
      title,
      generateDocx,
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

    // Récupérer l'utilisateur pour l'ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    const userId = user?.id || 'ai-system'

    // 1. Créer le chemin de fichier dans le Drive
    const driveFilePath = `projects/${projectId}/IA/${fileName}`
    console.log('📂 Chemin Drive:', driveFilePath)

    // 2. Déterminer le type de fichier et préparer le contenu
    const docTitle = title || fileName.replace(/\.(docx|pdf|csv|xlsx)$/i, '');
    const fileTypeInfo = determineFileType(fileName, aiMemberName || '', content);

    console.log('🎯 Type de fichier détecté:', {
      fileName,
      detectedType: fileTypeInfo.type,
      mimeType: fileTypeInfo.mimeType,
      aiMemberName
    });

    let fileContent: Uint8Array;
    let mimeType: string;

    if (generateDocx || fileTypeInfo.type !== 'docx') {
      // Générer le document selon le type détecté
      const generatedContent = fileTypeInfo.generator(content, docTitle, aiMemberName || 'IA Assistant');

      // Convertir en Uint8Array
      const encoder = new TextEncoder();
      fileContent = encoder.encode(generatedContent);
      mimeType = fileTypeInfo.mimeType;

      console.log(`📄 Document ${fileTypeInfo.type.toUpperCase()} généré, taille:`, fileContent.length);
    } else {
      // Sauvegarder comme markdown simple
      const encoder = new TextEncoder();
      fileContent = encoder.encode(content);
      mimeType = 'text/markdown';
      console.log('📝 Document Markdown sauvé, taille:', fileContent.length);
    }

    // 3. Vérifier/créer le dossier IA dans le Drive
    const iaFolderPath = `projects/${projectId}/IA`;

    // Vérifier si le dossier IA existe
    const { data: existingFolder } = await supabaseClient
      .from('drive_folders')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', iaFolderPath)
      .single();

    if (!existingFolder) {
      // Créer le dossier IA s'il n'existe pas
      console.log('📁 Création du dossier IA...');

      const { error: folderError } = await supabaseClient
        .from('drive_folders')
        .insert({
          project_id: projectId,
          name: 'IA',
          path: iaFolderPath,
          parent_path: `projects/${projectId}`,
          created_by: userId || 'ai-system',
          metadata: {
            description: 'Dossier des livrables générés par l\'IA',
            icon: '🤖',
            color: 'blue'
          }
        });

      if (folderError) {
        console.error('⚠️ Erreur création dossier IA:', folderError);
        // Continuer même si la création du dossier échoue
      } else {
        console.log('✅ Dossier IA créé');
      }
    }

    // 4. Uploader le fichier dans le storage Supabase
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('kanban-files')
      .upload(driveFilePath, fileContent, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur upload storage:', uploadError)
      throw new Error(`Erreur upload: ${uploadError.message}`)
    }

    console.log('✅ Fichier uploadé dans storage:', uploadData.path)

    // 4. Obtenir l'URL publique du fichier
    const { data: urlData } = supabaseClient.storage
      .from('kanban-files')
      .getPublicUrl(driveFilePath)

    // 5. Créer l'entrée dans la table kanban_files
    const driveEntry = {
      name: fileName,
      path: driveFilePath,
      file_type: mimeType,
      size: fileContent.length,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project_id: projectId,
      metadata: {
        folder_path: `projects/${projectId}/IA`,
        is_ai_generated: true,
        ai_member_name: aiMemberName,
        content_type: contentType || 'document',
        title: docTitle
      }
    }

    const { data: fileRecord, error: recordError } = await supabaseClient
      .from('kanban_files')
      .insert(driveEntry)
      .select()
      .single()

    if (recordError) {
      console.error('❌ Erreur création enregistrement:', recordError)
      console.warn('⚠️ Fichier sauvé mais sans enregistrement Drive')
    } else {
      console.log('✅ Enregistrement Drive créé:', fileRecord.id)
    }

    // 6. Créer un dossier IA s'il n'existe pas déjà
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
        fileSize: fileContent.length,
        contentType: mimeType,
        aiMemberName: aiMemberName,
        fileId: fileRecord?.id,
        driveIntegrated: !!fileRecord,
        format: fileTypeInfo.type || (generateDocx ? 'docx' : 'markdown'),
        detectedFileType: fileTypeInfo.type
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