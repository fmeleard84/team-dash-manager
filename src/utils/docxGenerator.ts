import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * Génère un document DOCX à partir de contenu markdown
 */
export async function generateDocxFromMarkdown(
  content: string,
  title: string,
  author: string = 'IA Team'
): Promise<string> {
  try {
    // Parser le markdown en sections
    const sections = parseMarkdownToSections(content);

    // Créer le document
    const doc = new Document({
      creator: author,
      title: title,
      description: `Document généré par ${author}`,
      sections: [{
        properties: {},
        children: [
          // Titre principal
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),

          // Auteur
          new Paragraph({
            children: [
              new TextRun({
                text: `Généré par ${author}`,
                italics: true,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 600,
            },
          }),

          // Contenu parsé
          ...sections.map(section => createParagraphFromSection(section)),
        ],
      }],
    });

    // Convertir en buffer
    const buffer = await Packer.toBuffer(doc);

    // Convertir en base64
    const base64 = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return base64;
  } catch (error) {
    console.error('Erreur génération DOCX:', error);
    // Fallback : retourner le contenu en texte brut encodé
    return btoa(content);
  }
}

/**
 * Parse le markdown en sections structurées
 */
function parseMarkdownToSections(markdown: string): any[] {
  const lines = markdown.split('\n');
  const sections = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      sections.push({
        type: 'h1',
        text: line.replace(/^# /, ''),
      });
    } else if (line.startsWith('## ')) {
      sections.push({
        type: 'h2',
        text: line.replace(/^## /, ''),
      });
    } else if (line.startsWith('### ')) {
      sections.push({
        type: 'h3',
        text: line.replace(/^### /, ''),
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      sections.push({
        type: 'bullet',
        text: line.replace(/^[-*] /, ''),
      });
    } else if (line.startsWith('1. ')) {
      sections.push({
        type: 'number',
        text: line.replace(/^\d+\. /, ''),
      });
    } else if (line.trim() !== '') {
      sections.push({
        type: 'paragraph',
        text: line,
      });
    }
  }

  return sections;
}

/**
 * Crée un paragraphe Word à partir d'une section
 */
function createParagraphFromSection(section: any): Paragraph {
  const { type, text } = section;

  // Traiter les styles inline (gras, italique)
  const runs = parseInlineStyles(text);

  switch (type) {
    case 'h1':
      return new Paragraph({
        children: runs,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      });

    case 'h2':
      return new Paragraph({
        children: runs,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      });

    case 'h3':
      return new Paragraph({
        children: runs,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      });

    case 'bullet':
      return new Paragraph({
        children: runs,
        bullet: {
          level: 0,
        },
        spacing: { after: 100 },
      });

    case 'number':
      return new Paragraph({
        children: runs,
        numbering: {
          reference: "default-numbering",
          level: 0,
        },
        spacing: { after: 100 },
      });

    default:
      return new Paragraph({
        children: runs,
        spacing: { after: 200 },
      });
  }
}

/**
 * Parse les styles inline (gras, italique)
 */
function parseInlineStyles(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Regex pour détecter les patterns **bold** et *italic*
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Gras
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      // Italique
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
      }));
    } else if (part) {
      // Texte normal
      runs.push(new TextRun({
        text: part,
      }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun(text)];
}